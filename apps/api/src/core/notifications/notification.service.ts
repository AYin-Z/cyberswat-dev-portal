import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../db/prisma.service'

/**
 * 通知中心 — 站内通知（@提及/任务/公告/点子/系统）。
 * M4 配合 socket.io 网关实时推送；未连接时通知落库，登录后拉取。
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name)

  constructor(private readonly prisma: PrismaService) {}

  /** 创建通知（全量落库，socket 推送由网关订阅事件完成） */
  async notify(input: {
    userId: string
    type: string
    title: string
    content?: string
    link?: string
  }): Promise<void> {
    await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        content: input.content,
        link: input.link,
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
