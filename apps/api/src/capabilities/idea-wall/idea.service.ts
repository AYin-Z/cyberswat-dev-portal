import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { IdeaStatus } from '@prisma/client'
import { EventBus } from '../../core/events/event-bus'
import { PrismaService } from '../../core/db/prisma.service'
import { ToolRegistry, type ToolCallContext } from '../../core/tools/tool.registry'

export interface IdeaView {
  id: string
  title: string
  description: string
  need: string
  techStack: string[]
  status: IdeaStatus
  author: { id: string; nickname: string; grade: string | null }
  joinerCount: number
  /** 当前用户是否已加入 */
  joined: boolean
  createdAt: string
  updatedAt: string
}

/**
 * 点子墙服务 — "点子→人力"连接机制（PRD 构思 #4）。
 * 有想法但缺人力/技术力/资源 → 发点子招募；成员申请加入 → 凑齐人力 → 孵化 → 转正（M3）。
 */
@Injectable()
export class IdeaService {
  private readonly logger = new Logger(IdeaService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBus,
    private readonly tools: ToolRegistry,
  ) {}

  /** 能力包初始化：注册工具 */
  init() {
    this.tools.register(
      {
        id: 'idea.search',
        description: '搜索点子墙（按状态/技术栈），供 agent 了解部门创意池与人力缺口',
        params: {
          status: { type: 'string', enum: ['RECRUITING', 'INCUBATING', 'PROMOTED', 'ARCHIVED'], description: '按状态筛选' },
          tech: { type: 'string', description: '按技术栈关键词筛选' },
          limit: { type: 'number', description: '条数上限，默认 20' },
        },
        requiredPermission: 'idea.view',
      },
      async (params: unknown) => this.searchForTool(params as { status?: IdeaStatus; tech?: string; limit?: number }),
    )
    this.tools.register(
      {
        id: 'idea.create',
        description: '发布点子到点子墙（缺人力/技术时招募成员，agent 代发需标注）',
        params: {
          title: { type: 'string', description: '点子标题' },
          description: { type: 'string', description: '想法/痛点描述' },
          need: { type: 'string', description: '缺什么：人力/技术力/资源' },
          techStack: { type: 'array', items: { type: 'string' }, description: '技术栈标签' },
        },
        requiredPermission: 'idea.post',
      },
      async (params: unknown, ctx: ToolCallContext) => {
        const p = params as { title: string; description: string; need: string; techStack?: string[] }
        return this.create(ctx.caller, p)
      },
    )
    this.logger.log('[idea-wall] 工具注册完成')
  }

  /** 列表（状态/技术栈筛选 + 当前用户加入状态） */
  async list(viewerId: string, opts?: { status?: IdeaStatus; tech?: string }): Promise<IdeaView[]> {
    const rows = await this.prisma.idea.findMany({
      where: {
        ...(opts?.status ? { status: opts.status } : {}),
        ...(opts?.tech ? { techStack: { has: opts.tech } } : {}),
      },
      include: {
        author: { select: { id: true, nickname: true, grade: true } },
        joiners: { where: { userId: viewerId }, select: { id: true } },
        _count: { select: { joiners: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 100,
    })
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      need: r.need,
      techStack: r.techStack,
      status: r.status,
      author: r.author,
      joinerCount: r._count.joiners,
      joined: r.joiners.length > 0,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }))
  }

  /** 详情 + 加入者名单 */
  async detail(id: string, viewerId: string) {
    const row = await this.prisma.idea.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, nickname: true, grade: true, skills: true, bio: true } },
        joiners: {
          include: { user: { select: { id: true, nickname: true, grade: true, skills: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!row) throw new NotFoundException('点子不存在')
    return {
      ...(await this.list(viewerId)).find((i) => i.id === id),
      joiners: row.joiners.map((j) => ({
        userId: j.user.id,
        nickname: j.user.nickname,
        grade: j.user.grade,
        skills: j.user.skills,
        message: j.message,
        joinedAt: j.createdAt.toISOString(),
      })),
    }
  }

  /** 发布点子（所有成员可发） */
  async create(authorId: string, data: { title: string; description: string; need: string; techStack?: string[] }): Promise<IdeaView> {
    if (!data.title || !data.description || !data.need) {
      throw new BadRequestException('标题/描述/缺什么 为必填')
    }
    const row = await this.prisma.idea.create({
      data: {
        title: data.title,
        description: data.description,
        need: data.need,
        techStack: data.techStack ?? [],
        authorId,
      },
      include: {
        author: { select: { id: true, nickname: true, grade: true } },
        joiners: { where: { userId: authorId }, select: { id: true } },
        _count: { select: { joiners: true } },
      },
    })
    this.events.emit('idea.created', { ideaId: row.id })
    this.logger.log(`[idea-wall] "${row.title}" 发布 by ${authorId} (缺: ${data.need})`)
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      need: row.need,
      techStack: row.techStack,
      status: row.status,
      author: row.author,
      joinerCount: row._count.joiners,
      joined: row.joiners.length > 0,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  /** 申请加入（"点子→人力"连接：发起人看到人力响应） */
  async join(ideaId: string, userId: string, message?: string): Promise<{ joined: boolean; joinerCount: number }> {
    const idea = await this.prisma.idea.findUnique({ where: { id: ideaId } })
    if (!idea) throw new NotFoundException('点子不存在')
    if (idea.status === 'PROMOTED' || idea.status === 'ARCHIVED') {
      throw new BadRequestException('该点子已转正/已废弃，无法加入')
    }
    if (idea.authorId === userId) throw new BadRequestException('不能加入自己发布的点子')

    const existing = await this.prisma.ideaJoiner.findUnique({
      where: { ideaId_userId: { ideaId, userId } },
    })
    if (existing) {
      // 幂等：已加入则返回当前状态
      const count = await this.prisma.ideaJoiner.count({ where: { ideaId } })
      return { joined: true, joinerCount: count }
    }

    await this.prisma.ideaJoiner.create({ data: { ideaId, userId, message } })
    // 有人加入 → 进入孵化中
    if (idea.status === 'RECRUITING') {
      await this.prisma.idea.update({ where: { id: ideaId }, data: { status: 'INCUBATING' } })
    }
    const count = await this.prisma.ideaJoiner.count({ where: { ideaId } })
    this.logger.log(`[idea-wall] ${userId} 加入 ${ideaId}`)
    return { joined: true, joinerCount: count }
  }

  /** 撤销加入 */
  async leave(ideaId: string, userId: string): Promise<void> {
    await this.prisma.ideaJoiner.deleteMany({ where: { ideaId, userId } })
    // 无人加入 → 回到招募中
    const count = await this.prisma.ideaJoiner.count({ where: { ideaId } })
    if (count === 0) {
      const idea = await this.prisma.idea.findUnique({ where: { id: ideaId } })
      if (idea && idea.status === 'INCUBATING') {
        await this.prisma.idea.update({ where: { id: ideaId }, data: { status: 'RECRUITING' } })
      }
    }
  }

  /** 状态流转：转正（M3 关联项目表）/ 归档（部长/发起人） */
  async setStatus(ideaId: string, status: IdeaStatus, operatorId: string): Promise<IdeaView> {
    const idea = await this.prisma.idea.findUnique({ where: { id: ideaId } })
    if (!idea) throw new NotFoundException('点子不存在')
    const row = await this.prisma.idea.update({
      where: { id: ideaId },
      data: { status },
      include: {
        author: { select: { id: true, nickname: true, grade: true } },
        joiners: { where: { userId: operatorId }, select: { id: true } },
        _count: { select: { joiners: true } },
      },
    })
    if (status === 'PROMOTED') {
      this.events.emit('idea.promoted', { ideaId, projectId: '' })
    }
    this.logger.log(`[idea-wall] ${ideaId} → ${status} by ${operatorId}`)
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      need: row.need,
      techStack: row.techStack,
      status: row.status,
      author: row.author,
      joinerCount: row._count.joiners,
      joined: row.joiners.length > 0,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  private async searchForTool(params: { status?: IdeaStatus; tech?: string; limit?: number }) {
    const rows = await this.prisma.idea.findMany({
      where: {
        ...(params.status ? { status: params.status } : {}),
        ...(params.tech ? { techStack: { has: params.tech } } : {}),
      },
      select: { id: true, title: true, need: true, techStack: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: Math.min(params.limit ?? 20, 50),
    })
    return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))
  }
}
