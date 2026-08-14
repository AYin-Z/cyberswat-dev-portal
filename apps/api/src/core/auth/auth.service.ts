import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { UsersService } from '../users/users.service'
import { EventBus } from '../events/event-bus'
import type { AuthUser } from '../permissions/permission.decorator'

export interface LoginResult {
  accessToken: string
  user: AuthUser
}

/**
 * 认证服务 — 邮箱+密码（bcrypt）+ JWT。
 * M1 已启用 GitHub OAuth 二级认证（见 auth.controller /github 路由）。
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsersService,
    private readonly events: EventBus,
  ) {}

  async register(email: string, password: string, nickname: string): Promise<LoginResult> {
    if (await this.users.findByEmail(email)) {
      throw new UnauthorizedException('邮箱已注册')
    }
    const passwordHash = await bcrypt.hash(password, 10)
    const user = await this.users.create({ email, nickname, passwordHash })
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

  private issue(id: string, role: AuthUser['role'], nickname: string): LoginResult {
    const payload = { sub: id, role, nickname }
    const accessToken = this.jwt.sign(payload, { expiresIn: '15m' })
    return { accessToken, user: { id, role, nickname } }
  }
}
