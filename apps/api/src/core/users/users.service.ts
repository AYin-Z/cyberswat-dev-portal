import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { CoreRole, Prisma } from '@prisma/client'
import type { InternalUserProfile, PublicUserProfile, Role } from '@cyberswat/shared'
import { EventBus } from '../events/event-bus'
import { PrismaService } from '../db/prisma.service'

/**
 * 用户服务 — Prisma 落库版（M1）。
 * 脱敏边界：对外只出 PublicUserProfile（昵称/年级/技能/签名/links），
 * 姓名/区队/邮箱仅 InternalUserProfile（dept-leader/admin 可见）。
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBus,
  ) {}

  /** 从 DB 行映射为内部档案（供内部/管理员消费） */
  toInternal(u: {
    id: string
    email: string
    nickname: string
    realName: string | null
    teamInfo: string | null
    grade: string | null
    skills: string[]
    bio: string | null
    avatarUrl: string | null
    github: string | null
    links: Prisma.JsonValue
    role: CoreRole
    active: boolean
    allowMatch: boolean
    createdAt: Date
  }): InternalUserProfile {
    return {
      id: u.id,
      nickname: u.nickname,
      grade: u.grade ?? '',
      skills: u.skills,
      bio: u.bio ?? undefined,
      links: (u.links as { label: string; url: string }[]) ?? [],
      avatarUrl: u.avatarUrl ?? undefined,
      github: u.github ?? undefined,
      realName: u.realName ?? '',
      teamInfo: u.teamInfo ?? '',
      email: u.email,
      role: this.mapRole(u.role),
      active: u.active,
      allowMatch: u.allowMatch,
      createdAt: u.createdAt.toISOString(),
    }
  }

  /** 对外脱敏视图 — 姓名/区队/邮箱/角色 永不外泄 */
  toPublic(user: InternalUserProfile): PublicUserProfile {
    const { realName: _rn, teamInfo: _ti, email: _e, role: _r, active: _a, createdAt: _c, ...pub } = user
    return pub
  }

  async create(input: {
    email: string
    nickname: string
    passwordHash: string
    role?: CoreRole
    github?: string
    githubId?: string
  }): Promise<InternalUserProfile> {
    const u = await this.prisma.coreUser.create({
      data: {
        email: input.email,
        nickname: input.nickname,
        passwordHash: input.passwordHash,
        role: input.role ?? 'MEMBER',
        github: input.github,
        githubId: input.githubId,
      },
    })
    this.events.emit('user.created', { userId: u.id })
    this.logger.log(`[users] ${u.id} ${u.email} 创建 (role=${u.role})`)
    return this.toInternal(u)
  }

  async findById(id: string): Promise<InternalUserProfile | undefined> {
    const u = await this.prisma.coreUser.findUnique({ where: { id } })
    return u ? this.toInternal(u) : undefined
  }

  async findByEmail(email: string): Promise<InternalUserProfile | undefined> {
    const u = await this.prisma.coreUser.findUnique({ where: { email } })
    return u ? this.toInternal(u) : undefined
  }

  async findByGithubId(githubId: string): Promise<InternalUserProfile | undefined> {
    const u = await this.prisma.coreUser.findUnique({ where: { githubId } })
    return u ? this.toInternal(u) : undefined
  }

  /** 登录校验用：返回带密码哈希的内部行 */
  async findWithPasswordHash(email: string) {
    return this.prisma.coreUser.findUnique({ where: { email } })
  }

  /** 更新个人资料（P1：年级/技能/签名/外链/匹配开关；仅本人可调） */
  async updateProfile(
    id: string,
    data: {
      nickname?: string
      grade?: string
      bio?: string
      skills?: string[]
      links?: { label: string; url: string }[]
      avatarUrl?: string
      allowMatch?: boolean
    },
  ): Promise<InternalUserProfile> {
    const u = await this.prisma.coreUser.update({
      where: { id },
      data: {
        nickname: data.nickname,
        grade: data.grade,
        bio: data.bio,
        skills: data.skills,
        links: data.links ? (data.links as unknown as Prisma.InputJsonValue) : undefined,
        avatarUrl: data.avatarUrl,
        allowMatch: data.allowMatch,
      },
    })
    return this.toInternal(u)
  }

  /** 更新 GitHub 绑定（OAuth 回调后同步） */
  async updateGithub(
    id: string,
    data: { github: string; githubId: string; githubToken?: string; avatarUrl?: string },
  ): Promise<InternalUserProfile> {
    const u = await this.prisma.coreUser.update({
      where: { id },
      data: {
        github: data.github,
        githubId: data.githubId,
        githubToken: data.githubToken,
        avatarUrl: data.avatarUrl,
      },
    })
    return this.toInternal(u)
  }

  async listPublic(): Promise<PublicUserProfile[]> {
    const users = await this.prisma.coreUser.findMany({ orderBy: { createdAt: 'desc' } })
    return users.map((u) => this.toPublic(this.toInternal(u)))
  }

  async getInternal(id: string): Promise<InternalUserProfile> {
    const u = await this.findById(id)
    if (!u) throw new NotFoundException('用户不存在')
    return u
  }

  private mapRole(role: CoreRole): Role {
    switch (role) {
      case 'ADMIN': return 'admin'
      case 'DEPT_LEADER': return 'dept-leader'
      case 'GUEST': return 'guest'
      default: return 'member'
    }
  }
}
