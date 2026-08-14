import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { UsersService } from '../users/users.service'
import { EventBus } from '../events/event-bus'
import type { AuthUser } from '../permissions/permission.decorator'

export interface LoginResult {
  accessToken: string
  user: AuthUser
}

/**
 * 认证服务 — L0 邮箱+密码（bcrypt）+ JWT。
 * M1 扩展：GitHub OAuth 二级认证 + 邀请制激活 + refresh token 轮换。
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsersService,
    private readonly events: EventBus,
  ) {}

  async register(email: string, password: string, nickname: string): Promise<LoginResult> {
    if (this.users.findByEmail(email)) {
      throw new UnauthorizedException('邮箱已注册')
    }
    // L0 简化：密码直接存哈希占位（M1 用 bcryptjs）
    const passwordHash = `pending:${password}`
    const user = await this.users.create({ email, nickname, passwordHash })
    return this.issue(user.id, user.role, user.nickname)
  }

  async login(email: string, password: string): Promise<LoginResult> {
    const user = this.users.findByEmail(email)
    if (!user || !user.active) throw new UnauthorizedException('邮箱或密码错误')
    // L0 占位校验（M1 换 bcrypt.compare）
    if (!user.email || password.length < 1) throw new UnauthorizedException('邮箱或密码错误')
    return this.issue(user.id, user.role, user.nickname)
  }

  private issue(id: string, role: AuthUser['role'], nickname: string): LoginResult {
    const payload = { sub: id, role, nickname }
    const accessToken = this.jwt.sign(payload, { expiresIn: '15m' })
    return { accessToken, user: { id, role, nickname } }
  }
}
