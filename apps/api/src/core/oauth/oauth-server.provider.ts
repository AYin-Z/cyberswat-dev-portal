import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import type { Response } from 'express'
import { createHash, randomBytes } from 'node:crypto'
import { PrismaService } from '../db/prisma.service'
import { requireJwtSecret } from '../config'
import { PermissionsService } from '../permissions/permissions.service'
import { OAuthClientsStore, genCode, genToken, oauthHash } from './oauth-clients.store'
import type { OAuthServerProvider as OAuthProviderIface, AuthorizationParams } from '../../../node_modules/@modelcontextprotocol/sdk/dist/cjs/server/auth/provider.js'
import type { OAuthClientInformationFull, OAuthTokens } from '../../../node_modules/@modelcontextprotocol/sdk/dist/cjs/shared/auth.js'
import type { AuthInfo } from '../../../node_modules/@modelcontextprotocol/sdk/dist/cjs/server/auth/types.js'

const CODE_TTL = 10 * 60 * 1000 // 授权码 10 分钟
// JWT_SECRET 统一走 requireJwtSecret()

/** access token = JWT（携带 sub=userId, scopes, clientId），verify 用 jose 验签 */
async function signAccessToken(userId: string, scopes: string[], clientId: string): Promise<string> {
  const { SignJWT } = await import('jose')
  return new SignJWT({ scopes, clientId, aud: 'mcp' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + Math.floor(ACCESS_TTL / 1000))
    .sign(new TextEncoder().encode(requireJwtSecret()))
}
const ACCESS_TTL = 60 * 60 * 1000 // access 1 小时
const REFRESH_TTL = 30 * 24 * 3600 * 1000 // refresh 30 天

/**
 * OAuth 2.1 授权服务器（R2-B）— 实现 SDK OAuthServerProvider。
 * 流程：DCR 注册 → authorize（成员浏览器登录+确认）→ code → token（scope=权限点级）→ MCP 工具调用。
 * 生命周期：冻结用户 → 级联撤销其 token（见 revokeUserTokens）。
 */
@Injectable()
export class CyberswatOAuthProvider implements OAuthProviderIface {
  private readonly logger = new Logger(CyberswatOAuthProvider.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly clients: OAuthClientsStore,
    private readonly permissions: PermissionsService,
  ) {}

  get clientsStore() {
    return this.clients
  }

  /** authorize：成员已登录（cookie session）→ 自动批准签发 code → redirect */
  async authorize(client: OAuthClientInformationFull, params: AuthorizationParams, res: Response): Promise<void> {
    const redirectUri = params.redirectUri
    const fail = (error: string, desc?: string) => {
      const u = new URL(redirectUri)
      u.searchParams.set('error', error)
      if (desc) u.searchParams.set('error_description', desc)
      if (params.state) u.searchParams.set('state', params.state)
      res.redirect(u.toString())
    }

    // 从 cookie 读取会话（登录时种 cs_session）
    const sessionToken = (res.req as any).cookies?.cs_session as string | undefined
    if (!sessionToken) {
      // 未登录 → 跳登录页，next 回 authorize
      const authorizeUrl = (res.req as any).originalUrl
      res.redirect(`/login?next=${encodeURIComponent(authorizeUrl)}`)
      return
    }
    const user = await this.resolveSession(sessionToken)
    if (!user) {
      fail('access_denied', '会话已失效，请重新登录')
      return
    }

    // 🔴-5b：scope 必须 ⊆ owner 角色实际拥有的权限点（防止 scope 膨胀越权）
    const allowed = await this.allowedScopesFor(user.id, params.scopes ?? [])
    if (allowed.length === 0 && (params.scopes ?? []).length > 0) {
      fail('access_denied', '请求的权限超出你的角色范围')
      return
    }
    const code = genCode()
    await this.prisma.coreOauthCode.create({
      data: {
        clientId: client.client_id,
        code,
        codeChallenge: params.codeChallenge,
        userId: user.id,
        scopes: allowed,
        redirectUri,
        expiresAt: new Date(Date.now() + CODE_TTL),
      },
    })
    const u = new URL(redirectUri)
    u.searchParams.set('code', code)
    if (params.state) u.searchParams.set('state', params.state)
    res.redirect(u.toString())
    this.logger.log(`[oauth] ${user.id.slice(0, 8)} 授权 ${client.client_id} scopes=${(params.scopes ?? []).join(',')}`)
  }

  async challengeForAuthorizationCode(client: OAuthClientInformationFull, authorizationCode: string): Promise<string> {
    const c = await this.prisma.coreOauthCode.findUnique({ where: { code: authorizationCode } })
    if (!c) throw new BadRequestException('code 不存在')
    return c.codeChallenge
  }

  /** code → tokens（PKCE 校验 + scope 权限点校验） */
  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
    codeVerifier?: string,
    redirectUri?: string,
  ): Promise<OAuthTokens> {
    try {
    const c = await this.prisma.coreOauthCode.findUnique({ where: { code: authorizationCode } })
    if (!c || c.used || c.expiresAt < new Date()) throw new BadRequestException('授权码无效或已过期')
    if (c.clientId !== client.client_id) throw new BadRequestException('client 不匹配')
    if (redirectUri && c.redirectUri !== redirectUri) throw new BadRequestException('redirect_uri 不匹配')
    // 注意：PKCE 校验由 SDK 本地完成（challengeForAuthorizationCode → verifyChallenge）

    await this.prisma.coreOauthCode.update({ where: { id: c.id }, data: { used: true } })

    const accessToken = await signAccessToken(c.userId, c.scopes, client.client_id)
    const refreshToken = genToken()
    await this.prisma.coreOauthToken.create({
      data: {
        clientId: client.client_id,
        userId: c.userId,
        scope: c.scopes,
        tokenHash: oauthHash(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL),
      },
    })
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: Math.floor(ACCESS_TTL / 1000),
      scope: c.scopes.join(' '),
    }
    } catch (err) {
      this.logger.error(`[oauth] exchange 失败: ${err instanceof Error ? err.stack : err}`)
      throw err
    }
  }

  /** refresh → 新 access（轮换） */
  async exchangeRefreshToken(client: OAuthClientInformationFull, refreshToken: string, scopes?: string[]): Promise<OAuthTokens> {
    const row = await this.prisma.coreOauthToken.findUnique({ where: { tokenHash: oauthHash(refreshToken) } })
    if (!row || row.revoked) throw new UnauthorizedException('refresh token 无效')
    if (row.expiresAt < new Date()) throw new UnauthorizedException('refresh token 已过期')
    if (row.clientId !== client.client_id) throw new UnauthorizedException('client 不匹配')
    // 🔴-6b：refresh 前校验用户仍激活
    const owner = await this.prisma.coreUser.findUnique({ where: { id: row.userId }, select: { active: true } })
    if (!owner?.active) throw new UnauthorizedException('账号已停用')

    // 🔴-5c：refresh 请求的 scope 必须 ⊆ 原 scope（防自提权）
    if (scopes && scopes.some((sc) => !row.scope.includes(sc))) {
      throw new UnauthorizedException('scope 超出原授权范围')
    }
    const newRefresh = genToken()
    await this.prisma.coreOauthToken.update({
      where: { id: row.id },
      data: { revoked: true },
    })
    const scopeList = scopes ?? row.scope
    await this.prisma.coreOauthToken.create({
      data: {
        clientId: client.client_id,
        userId: row.userId,
        scope: scopeList,
        tokenHash: oauthHash(newRefresh),
        expiresAt: new Date(Date.now() + REFRESH_TTL),
      },
    })
    return {
      access_token: await signAccessToken(row.userId, scopeList, client.client_id),
      refresh_token: newRefresh,
      token_type: 'Bearer',
      expires_in: Math.floor(ACCESS_TTL / 1000),
      scope: (scopes ?? row.scope).join(' '),
    }
  }

  /** access token 校验 → AuthInfo（userId + scopes） */
  async verifyAccessToken(token: string): Promise<AuthInfo> {
    // access token 无状态存储 → 用 refresh 行关联查询（简化：access 与 refresh 成对签发）
    // 更稳：access token 用 JWT 签名（复用 JWT_SECRET），携带 sub+scopes
    try {
      const { jwtVerify } = await import('jose')
      const secret = new TextEncoder().encode(requireJwtSecret())
      const { payload } = await jwtVerify(token, secret)
      this.logger.log(`[oauth] verify token: scopes=${JSON.stringify(payload.scopes)} sub=${payload.sub}`)
      return {
        token,
        scopes: (payload.scopes as string[]) ?? [],
        clientId: (payload.clientId as string) ?? '',
        expiresAt: typeof payload.exp === 'number' ? payload.exp : Math.floor(Date.now() / 1000) + 3600,
        extra: { userId: payload.sub as string },
      } as AuthInfo
    } catch {
      throw new UnauthorizedException('access token 无效')
    }
  }

  /** 🔴-5b：owner 角色实际拥有的 scope（权限点） */
  private async allowedScopesFor(userId: string, requested: string[]): Promise<string[]> {
    const user = await this.prisma.coreUser.findUnique({ where: { id: userId }, select: { role: true } })
    if (!user) return []
    // 角色 → 权限点：直接按角色的可见工具权限点聚合（简化：允许所有其角色可见工具的 requiredPermission + 已注册权限点）
    const permRows = await this.prisma.coreRolePermission.findMany({ where: { role: user.role } })
    const dbPerms = new Set(permRows.map((r) => r.permission))
    const rolePerms = new Set<string>()
    // 从 PermissionService 的内存 defaultRoles 推导（注册时的默认映射）
    const roleName = user.role.toLowerCase() as 'guest' | 'member' | 'dept-leader' | 'admin'
    for (const p of this.permissions.list()) {
      if (p.defaultRoles.includes(roleName)) rolePerms.add(p.id)
    }
    return requested.filter((sc) => dbPerms.has(sc) || rolePerms.has(sc) || this.isCoreScope(sc))
  }

  /** 内核级 scope（无需角色即有：example.* 等无权限点工具） */
  private isCoreScope(sc: string): boolean {
    return sc.startsWith('example.') || sc.startsWith('core.')
  }

  /** 撤销（用户冻结时级联） */
  async revokeUserTokens(userId: string): Promise<void> {
    await this.prisma.coreOauthToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    })
  }

  /** 会话解析：登录时种的 cookie 内为 JWT（与 Authorization header 同款） */
  private async resolveSession(sessionToken: string) {
    try {
      const { jwtVerify } = await import('jose')
      const secret = new TextEncoder().encode(requireJwtSecret())
      const { payload } = await jwtVerify(sessionToken, secret)
      const user = await this.prisma.coreUser.findUnique({ where: { id: payload.sub as string } })
      return user?.active ? user : null
    } catch {
      return null
    }
  }
}
