import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { EventBus } from '../../core/events/event-bus'
import { PrismaService } from '../../core/db/prisma.service'
import { ToolRegistry, type ToolCallContext } from '../../core/tools/tool.registry'

export interface AnnouncementView {
  id: string
  title: string
  content: string
  important: boolean
  publishedAt: string | null
  author: { id: string; nickname: string }
  /** 当前用户视角 */
  read: boolean
  confirmed: boolean
}

/** 部长视角：已读/未读统计 */
export interface AnnouncementStats {
  total: number
  read: number
  unread: number
  confirmed: number
}

/**
 * 公告服务 — 发布 / 已读追踪 / 重要确认。
 * 信息流转三件套之"上情下达"：公告 → 已读追踪（谁看了没看）。
 */
@Injectable()
export class AnnouncementService {
  private readonly logger = new Logger(AnnouncementService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBus,
    private readonly tools: ToolRegistry,
  ) {}

  /** 能力包初始化：注册插件清单 + 工具 */
  init() {
    this.tools.register(
      {
        id: 'announcement.list',
        description: '列出公告（标题/重要标记/发布状态），供 agent 了解部门动态',
        params: {
          importantOnly: { type: 'boolean', description: '只看重要公告' },
          limit: { type: 'number', description: '条数上限，默认 20' },
        },
        requiredPermission: 'announcement.view',
      },
      async (params, ctx) => this.listForTool(params as { importantOnly?: boolean; limit?: number }, ctx),
    )
    this.tools.register(
      {
        id: 'announcement.publish',
        description: '发布公告（agent 起草，需部长审批后生效）',
        params: {
          title: { type: 'string', description: '公告标题' },
          content: { type: 'string', description: '公告正文' },
          important: { type: 'boolean', description: '是否重要公告（需确认收到）' },
        },
        requiredPermission: 'announcement.publish',
        requiresApproval: true,
      },
      async (params, ctx) => this.publishForTool(params as { title: string; content: string; important?: boolean }, ctx),
    )
    this.logger.log('[announcement] 工具注册完成')
  }

  /** 列表（当前用户已读状态） */
  async list(viewerId: string, opts?: { importantOnly?: boolean }): Promise<AnnouncementView[]> {
    const rows = await this.prisma.announcement.findMany({
      where: opts?.importantOnly ? { important: true } : undefined,
      include: {
        author: { select: { id: true, nickname: true } },
        reads: { where: { userId: viewerId }, select: { confirmed: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      important: r.important,
      publishedAt: r.publishedAt?.toISOString() ?? null,
      author: r.author,
      read: r.reads.length > 0,
      confirmed: r.reads[0]?.confirmed ?? false,
    }))
  }

  /** 发布（人工） */
  async publish(authorId: string, data: { title: string; content: string; important?: boolean }): Promise<AnnouncementView> {
    const row = await this.prisma.announcement.create({
      data: {
        title: data.title,
        content: data.content,
        important: data.important ?? false,
        publishedAt: new Date(),
        authorId,
      },
      include: {
        author: { select: { id: true, nickname: true } },
        reads: { where: { userId: authorId }, select: { confirmed: true } },
      },
    })
    // 信息流转核心事件：通知中心/agent 订阅
    this.events.emit('announcement.published', {
      announcementId: row.id,
      title: row.title,
    })
    this.logger.log(`[announcement] 发布 "${row.title}" (important=${row.important})`)
    return this.toView(row)
  }

  /** 详情（无副作用） */
  async detail(announcementId: string, userId: string): Promise<AnnouncementView> {
    const row = await this.prisma.announcement.findUnique({
      where: { id: announcementId },
      include: {
        author: { select: { id: true, nickname: true } },
        reads: { where: { userId }, select: { confirmed: true } },
      },
    })
    if (!row) throw new NotFoundException('公告不存在')
    return this.toView(row)
  }

  /** 阅读：标记已读 + 重要公告确认（幂等） */
  async markRead(announcementId: string, userId: string, confirm = false): Promise<AnnouncementView> {
    const ann = await this.prisma.announcement.findUnique({
      where: { id: announcementId },
      include: {
        author: { select: { id: true, nickname: true } },
        reads: { where: { userId }, select: { confirmed: true } },
      },
    })
    if (!ann) throw new NotFoundException('公告不存在')

    const existing = ann.reads[0]
    if (existing) {
      if (confirm && !existing.confirmed) {
        await this.prisma.announcementRead.update({
          where: { announcementId_userId: { announcementId, userId } },
          data: { confirmed: true },
        })
      }
    } else {
      await this.prisma.announcementRead.create({
        data: { announcementId, userId, confirmed: confirm },
      })
    }
    return this.toView(await this.reload(announcementId, userId))
  }

  /** 部长视角：已读/未读统计 + 名单 */
  async stats(announcementId: string): Promise<AnnouncementStats & { readers: { userId: string; nickname: string; readAt: string; confirmed: boolean }[]; unreadUsers: { id: string; nickname: string }[] }> {
    const ann = await this.prisma.announcement.findUnique({
      where: { id: announcementId },
      include: { reads: { include: { user: { select: { id: true, nickname: true } } } }, author: true },
    })
    if (!ann) throw new NotFoundException('公告不存在')

    const allUsers = await this.prisma.coreUser.findMany({ where: { active: true }, select: { id: true, nickname: true } })
    const readIds = new Set(ann.reads.map((r) => r.userId))
    return {
      total: allUsers.length,
      read: ann.reads.length,
      unread: allUsers.length - ann.reads.length,
      confirmed: ann.reads.filter((r) => r.confirmed).length,
      readers: ann.reads.map((r) => ({
        userId: r.userId,
        nickname: r.user.nickname,
        readAt: r.readAt.toISOString(),
        confirmed: r.confirmed,
      })),
      unreadUsers: allUsers.filter((u) => !readIds.has(u.id)),
    }
  }

  /** agent 工具：列表 */
  private async listForTool(params: { importantOnly?: boolean; limit?: number }, _ctx: ToolCallContext) {
    const rows = await this.prisma.announcement.findMany({
      where: params.importantOnly ? { important: true } : undefined,
      select: { id: true, title: true, important: true, publishedAt: true },
      orderBy: { createdAt: 'desc' },
      take: Math.min(params.limit ?? 20, 50),
    })
    return rows.map((r) => ({ ...r, publishedAt: r.publishedAt?.toISOString() ?? null }))
  }

  /** agent 工具：发布（走审批） */
  private async publishForTool(params: { title: string; content: string; important?: boolean }, ctx: ToolCallContext) {
    return this.publish(ctx.caller, params)
  }

  private async reload(id: string, userId: string) {
    const row = await this.prisma.announcement.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, nickname: true } },
        reads: { where: { userId }, select: { confirmed: true } },
      },
    })
    if (!row) throw new NotFoundException('公告不存在')
    return row
  }

  private toView(row: {
    id: string
    title: string
    content: string
    important: boolean
    publishedAt: Date | null
    author: { id: string; nickname: string }
    reads: { confirmed: boolean }[]
  }): AnnouncementView {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      important: row.important,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      author: row.author,
      read: row.reads.length > 0,
      confirmed: row.reads[0]?.confirmed ?? false,
    }
  }
}
