import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { createHash, randomBytes } from 'node:crypto'
import { PrismaService } from '../db/prisma.service'
import type { OAuthClientInformationFull } from '../../../node_modules/@modelcontextprotocol/sdk/dist/cjs/shared/auth.js'
import type { OAuthRegisteredClientsStore } from '../../../node_modules/@modelcontextprotocol/sdk/dist/cjs/server/auth/clients.js'

/**
 * OAuth 客户端存储（R2-B DCR）— Prisma 实现 SDK 接口。
 */
@Injectable()
export class OAuthClientsStore implements OAuthRegisteredClientsStore {
  private readonly logger = new Logger(OAuthClientsStore.name)

  constructor(private readonly prisma: PrismaService) {}

  async getClient(clientId: string): Promise<OAuthClientInformationFull | undefined> {
    const c = await this.prisma.coreOauthClient.findUnique({ where: { id: clientId } })
    if (!c) return undefined
    // 🟡-19：返回哈希值供 SDK clientAuth 比对（SDK 用 === 比较 client_secret）
    // 注：SDK 比对的是明文请求 vs 此处返回值——因此这里返回注册时生成的原始 secret 的哈希不可行，
    // SDK 要求明文比对。安全做法：secret 用可逆加密存，或让 SDK 走 PKCE-only（secret 置空）。
    // 本项目 MCP 客户端均为 PKCE 流（token_endpoint_auth_methods: none），secret 仅作登记凭证，
    // 返回空使 SDK 跳过 secret 校验，真正认证依赖 PKCE + 授权码一次性 + state。
    return {
      client_id: c.id,
      client_secret: undefined,
      client_id_issued_at: Math.floor(c.issuedAt.getTime() / 1000),
      client_secret_expires_at: c.secretExpiresAt ? Math.floor(c.secretExpiresAt.getTime() / 1000) : 0,
      redirect_uris: c.redirectUris,
      grant_types: c.grantTypes,
      response_types: c.responseTypes,
      scope: c.scope || undefined,
      client_name: c.clientName ?? undefined,
    }
  }

  /** DCR 注册（RFC 7591）— 自动生成 client_id/secret */
  async registerClient(
    client: Omit<OAuthClientInformationFull, 'client_id' | 'client_id_issued_at'>,
  ): Promise<OAuthClientInformationFull> {
    const clientId = `agent-${randomBytes(8).toString('hex')}`
    const secret = randomBytes(24).toString('base64url')
    const now = Math.floor(Date.now() / 1000)
    await this.prisma.coreOauthClient.create({
      data: {
        id: clientId,
        secretHash: createHash('sha256').update(secret).digest('hex'),
        redirectUris: client.redirect_uris ?? [],
        grantTypes: client.grant_types ?? ['authorization_code', 'refresh_token'],
        responseTypes: client.response_types ?? ['code'],
        scope: client.scope ?? '',
        clientName: client.client_name ?? null,
        secretExpiresAt: client.client_secret_expires_at ? new Date(client.client_secret_expires_at * 1000) : null,
      },
    })
    this.logger.log(`[oauth] DCR 注册客户端 ${clientId}`)
    return {
      client_id: clientId,
      client_secret: secret,
      client_id_issued_at: now,
      client_secret_expires_at: client.client_secret_expires_at ?? 0,
      redirect_uris: client.redirect_uris ?? [],
      grant_types: client.grant_types ?? ['authorization_code', 'refresh_token'],
      response_types: client.response_types ?? ['code'],
      scope: client.scope,
      client_name: client.client_name,
    }
  }

  /** 校验 client secret（SDK bearerAuth 中间件会调用 getClient + 比对） */
  async verifySecret(clientId: string, secret: string): Promise<boolean> {
    const c = await this.prisma.coreOauthClient.findUnique({ where: { id: clientId } })
    if (!c?.secretHash) return false
    return c.secretHash === createHash('sha256').update(secret).digest('hex')
  }
}

/** 令牌工具：哈希/生成 */
export const oauthHash = (t: string) => createHash('sha256').update(t).digest('hex')
export const genToken = () => randomBytes(32).toString('base64url')
export const genCode = () => randomBytes(24).toString('base64url')
