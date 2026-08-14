import { Injectable, Logger } from '@nestjs/common'
import type { InternalUserProfile, PublicUserProfile, Role } from '@cyberswat/shared'
import { EventBus } from '../events/event-bus'

/**
 * 用户服务 — L0 内存态（M1 迁移 Prisma）。
 * 脱敏边界：对外只出 PublicUserProfile（昵称/年级/技能/签名/links），
 * 姓名/区队/邮箱仅 InternalUserProfile（dept-leader/admin 可见）。
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name)
  private readonly users = new Map<string, InternalUserProfile>()

  constructor(private readonly events: EventBus) {}

  async create(input: {
    email: string
    nickname: string
    passwordHash: string
    role?: Role
  }): Promise<InternalUserProfile> {
    const id = crypto.randomUUID()
    const user: InternalUserProfile = {
      id,
      nickname: input.nickname,
      grade: '2026',
      skills: [],
      links: [],
      realName: '',
      teamInfo: '',
      email: input.email,
      role: input.role ?? 'member',
      active: true,
      createdAt: new Date().toISOString(),
    }
    // L0 内存态暂存 passwordHash 于附属结构（M1 入 Prisma User 表）
    this.users.set(id, user)
    this.events.emit('user.created', { userId: id })
    this.logger.log(`[users] ${id} ${input.email} 创建 (role=${user.role})`)
    return user
  }

  findById(id: string): InternalUserProfile | undefined {
    return this.users.get(id)
  }

  findByEmail(email: string): InternalUserProfile | undefined {
    return [...this.users.values()].find((u) => u.email === email)
  }

  /** 对外脱敏视图 */
  toPublic(user: InternalUserProfile): PublicUserProfile {
    const { realName: _rn, teamInfo: _ti, email: _e, role: _r, active: _a, createdAt: _c, ...pub } = user
    return pub
  }

  listPublic(): PublicUserProfile[] {
    return [...this.users.values()].map((u) => this.toPublic(u))
  }
}
