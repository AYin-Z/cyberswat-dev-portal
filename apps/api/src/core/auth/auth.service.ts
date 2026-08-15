import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
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
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_MAX = 10 // 每邮箱 15 分钟 10 次

/** 🔴-9：登录/注册限速（内存计数，防爆破/撞库） */
class LoginThrottle {
  private hits = new Map<string, number[]>()
  check(key: string) {
    const now = Date.now()
    const arr = (this.hits.get(key) ?? []).filter((t) => now - t < LOGIN_WINDOW_MS)
    if (arr.length >= LOGIN_MAX) {
      throw new UnauthorizedException('尝试过于频繁，请 15 分钟后再试')
    }
    arr.push(now)
    this.hits.set(key, arr)
  }
}

/**
 * 认证服务 — 邀请制注册 + 邮箱密码(bcrypt) + JWT + refresh 轮换。
 * PRD 构思 #1：邮箱为主 + GitHub OAuth 二级；注册必须携带有效邀请令牌。
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)
  private readonly throttle = new LoginThrottle()

  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsersService,
    private readonly invites: InviteService,
    private readonly events: EventBus,
    private readonly prisma: PrismaService,
  ) {}

  /** 注册：必须携带邀请令牌（角色来自邀请，成员生命周期入口） */
  async register(email: string, password: string, nickname: string, inviteToken: string): Promise<LoginResult> {
    email = email.trim().toLowerCase()
    this.throttle.check(`reg:${email}`)
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
    email = email.trim().toLowerCase()
    this.throttle.check(`login:${email}`)
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

    // 轮换：旧 token 作废（🟡-18：新 token 的 replacedBy 指向旧 id，形成审计链）
    await this.prisma.coreRefreshToken.update({
      where: { id: row.id },
      data: { revoked: true },
    })
    const result = await this.issue(user.id, user.role, user.nickname, row.id)
    // 重用检测：若旧 token 已轮换后再次使用（被盗重放），撤销该用户全部 refresh（止损）
    const oldAlreadyReplaced = await this.prisma.coreRefreshToken.findFirst({
      where: { userId: row.userId, revoked: true, replacedBy: { not: null } },
      orderBy: { createdAt: 'desc' },
    })
    if (oldAlreadyReplaced) {
      await this.prisma.coreRefreshToken.updateMany({
        where: { userId: row.userId, revoked: false },
        data: { revoked: true },
      })
      this.logger.warn(`[auth] 检测到 refresh 重用，已撤销用户 ${row.userId.slice(0, 8)} 全部会话`)
    }
    return result
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
          // 🔴-10c：GitHub access token 不明文入库（仅存 githubId 用于身份）
          avatarUrl,
        })
      }
    }
    if (!user) {
      // 🔴-2 修复：关闭自动建号（邀请制是成员边界）。GitHub 仅用于已有账号的绑定/快捷登录。
      // 未绑定 → 抛出，前端提示联系部长获取邀请链接；绑定由登录后"资料页绑定 GitHub"完成
      throw new UnauthorizedException('该 GitHub 账号未绑定任何成员账号，请联系部长获取邀请链接后注册')
    }
    this.events.emit('user.created', { userId: user.id })
    return this.issue(user.id, user.role, user.nickname)
  }

  /** 签发 access + refresh（refresh 落库，可记录轮换链） */
  private async issue(id: string, role: AuthUser['role'], nickname: string, replacedBy?: string): Promise<LoginResult> {
    const payload = { sub: id, role, nickname, aud: 'web' }
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
