import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../db/prisma.service'
import { EventBus } from '../events/event-bus'

/**
 * 通知中心 — 站内通知（@提及/任务/公告/点子/系统）。
 * M4 配合 socket.io 网关实时推送；未连接时通知落库，登录后拉取。
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBus,
  ) {}

  /** 创建通知（全量落库；🟡-9：落库后经事件总线推送 socket，评论/点赞/@/匹配全覆盖） */
  async notify(input: {
    userId: string
    type: string
    title: string
    content?: string
    link?: string
  }): Promise<void> {
    const row = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        content: input.content,
        link: input.link,
      },
    })
    // 🟡-9：事件总线广播（网关 @OnEvent('notification.created') 实时推送，覆盖评论/点赞/@/匹配/审批）
    this.events.emitRaw('notification.created', {
      userId: input.userId,
      notification: {
        id: row.id,
        type: row.type,
        title: row.title,
        content: row.content,
        link: row.link,
        read: row.read,
        createdAt: row.createdAt.toISOString(),
      },
    })
  }

  /** 我的通知（未读优先） */
  async listFor(userId: string): Promise<
    { id: string; type: string; title: string; content: string | null; link: string | null; read: boolean; createdAt: string }[]
  > {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: [{ read: 'asc' }, { createdAt: 'desc' }],
      take: 50,
    })
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      content: r.content,
      link: r.link,
      read: r.read,
      createdAt: r.createdAt.toISOString(),
    }))
  }

  /** 未读数 */
  async unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, read: false } })
  }

  /** 标记已读 */
  async markRead(userId: string, notificationId?: string): Promise<void> {
    if (notificationId) {
      await this.prisma.notification.updateMany({ where: { id: notificationId, userId }, data: { read: true } })
    } else {
      await this.prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } })
    }
  }
}
