import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { createHash, randomBytes } from 'node:crypto'
import { UsersService } from '../users/users.service'
import { InviteService } from '../invites/invite.service'
import { EventBus } from '../events/event-bus'
import { PrismaService } from '../db/prisma.service'
import type { AuthUser } from '../permissions/permission.decorator'

export interface LoginResult {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

const REFRESH_TTL_MS = 14 * 24 * 3600 * 1000 // 14 天

/**
 * 认证服务 — 邀请制注册 + 邮箱密码(bcrypt) + JWT + refresh 轮换。
 * PRD 构思 #1：邮箱为主 + GitHub OAuth 二级；注册必须携带有效邀请令牌。
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsersService,
    private readonly invites: InviteService,
    private readonly events: EventBus,
    private readonly prisma: PrismaService,
  ) {}

  /** 注册：必须携带邀请令牌（角色来自邀请，成员生命周期入口） */
  async register(email: string, password: string, nickname: string, inviteToken: string): Promise<LoginResult> {
    if (await this.users.findByEmail(email)) {
      throw new UnauthorizedException('邮箱已注册')
    }
    const invite = await this.invites.validate(inviteToken)
    const passwordHash = await bcrypt.hash(password, 10)
    const user = await this.users.create({
      email,
      nickname,
      passwordHash,
      role: invite.role,
    })
    await this.invites.consume(inviteToken)
    return this.issue(user.id, user.role, user.nickname)
  }

  async login(email: string, password: string): Promise<LoginResult> {
    const row = await this.users.findWithPasswordHash(email)
    if (!row || !row.active) throw new UnauthorizedException('邮箱或密码错误')
    const ok = await bcrypt.compare(password, row.passwordHash)
    if (!ok) throw new UnauthorizedException('邮箱或密码错误')
    const user = this.users.toInternal(row)
    return this.issue(user.id, user.role, user.nickname)
  }

  /** refresh 轮换：旧 token 校验 → 作废 → 签发新对（防重放） */
  async refresh(refreshToken: string): Promise<LoginResult> {
    const hash = this.hashToken(refreshToken)
    const row = await this.prisma.coreRefreshToken.findUnique({ where: { tokenHash: hash } })
    if (!row || row.revoked) throw new UnauthorizedException('refresh token 无效或已轮换')
    if (row.expiresAt < new Date()) throw new UnauthorizedException('refresh token 已过期')

    const user = await this.users.findById(row.userId)
    if (!user || !user.active) throw new UnauthorizedException('用户不存在或已停用')

    // 轮换：旧 token 作废，新 token 落库时记录轮换链（审计）
    await this.prisma.coreRefreshToken.update({
      where: { id: row.id },
      data: { revoked: true },
    })
    return this.issue(user.id, user.role, user.nickname, row.id)
  }

  /** GitHub OAuth 回调：按 githubId 登录或创建账号（绑定邮箱） */
  async githubLogin(githubId: string, github: string, email: string | null, nickname: string, avatarUrl?: string, token?: string): Promise<LoginResult> {
    let user = await this.users.findByGithubId(githubId)
    if (!user && email) {
      // 已用邮箱注册过 → 绑定 GitHub
      const existing = await this.users.findByEmail(email)
      if (existing) {
        user = await this.users.updateGithub(existing.id, {
          github,
          githubId,
          githubToken: token,
          avatarUrl,
        })
      }
    }
    if (!user) {
      // 全新 GitHub 用户 → 自动建号（邮箱缺失时用 github 用户名占位）
      const fallbackEmail = email ?? `${github}@github.local`
      user = await this.users.create({
        email: fallbackEmail,
        nickname,
        passwordHash: `github-only:${githubId}`,
        github,
        githubId,
      })
      if (avatarUrl || token) {
        user = await this.users.updateGithub(user.id, { github, githubId, githubToken: token, avatarUrl })
      }
    }
    this.events.emit('user.created', { userId: user.id })
    return this.issue(user.id, user.role, user.nickname)
  }

  /** 签发 access + refresh（refresh 落库，可记录轮换链） */
  private async issue(id: string, role: AuthUser['role'], nickname: string, replacedBy?: string): Promise<LoginResult> {
    const payload = { sub: id, role, nickname }
    const accessToken = this.jwt.sign(payload, { expiresIn: '15m' })

    const refreshToken = randomBytes(32).toString('base64url')
    await this.prisma.coreRefreshToken.create({
      data: {
        tokenHash: this.hashToken(refreshToken),
        userId: id,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
        replacedBy,
      },
    })
    return { accessToken, refreshToken, user: { id, role, nickname } }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }
}
