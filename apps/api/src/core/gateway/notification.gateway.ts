import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { JwtService } from '@nestjs/jwt'
import { NotificationService } from '../notifications/notification.service'
import { PrismaService } from '../db/prisma.service'
import { OnEvent } from '@nestjs/event-emitter'
import type { CoreEventMap } from '@cyberswat/shared'

/**
 * 通知网关 — socket.io 实时推送（M4）。
 * 连接时用 JWT 认证（query.token 或 handshake.auth.token），
 * 订阅事件 → 推送到对应用户 room（user:<id>）。
 */
@WebSocketGateway({
  cors: { origin: true, credentials: true },
  path: '/socket.io',
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server

  constructor(
    private readonly jwt: JwtService,
    private readonly notifications: NotificationService,
    private readonly prisma: PrismaService,
  ) {}

  /** 连接认证：解析 JWT → 加入用户 room */
  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.query?.token as string | undefined)
      if (!token) throw new Error('no token')
      const payload = this.jwt.verify<{ sub: string }>(token)
      client.data.userId = payload.sub
      await client.join(`user:${payload.sub}`)
      await client.join('all') // 全员广播 room（公告/点子）
      // 连接即推送未读数
      const unread = await this.notifications.unreadCount(payload.sub)
      client.emit('notification:unread', { count: unread })
    } catch {
      client.disconnect(true)
    }
  }

  handleDisconnect(client: Socket) {
    // room 随连接自动清理
    void client
  }

  /** 前端可主动查询未读数 */
  @SubscribeMessage('notification:fetch')
  async onFetch(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId as string | undefined
    if (!userId) return
    const list = await this.notifications.listFor(userId)
    client.emit('notification:list', list)
  }

  /** 标记已读 */
  @SubscribeMessage('notification:read')
  async onRead(@ConnectedSocket() client: Socket, @MessageBody() body: { id?: string }) {
    const userId = client.data.userId as string | undefined
    if (!userId) return
    await this.notifications.markRead(userId, body?.id)
    const unread = await this.notifications.unreadCount(userId)
    client.emit('notification:unread', { count: unread })
  }

  // ============ 事件 → 实时推送 ============

  /** 公告发布 → 全成员推送 */
  @OnEvent('announcement.published')
  async onAnnouncement(payload: CoreEventMap['announcement.published']) {
    const users = await this.prisma.coreUser.findMany({ where: { active: true }, select: { id: true } })
    for (const u of users) {
      await this.notifications.notify({
        userId: u.id,
        type: 'announcement',
        title: `新公告：${payload.title}`,
        link: '/announcements',
      })
    }
    this.server.to('all').emit('notification:new', {
      type: 'announcement',
      title: `新公告：${payload.title}`,
      link: '/announcements',
    })
  }

  /** 任务状态变化 → 指派人/创建者推送 */
  @OnEvent('task.status.changed')
  async onTaskChanged(payload: CoreEventMap['task.status.changed']) {
    const task = await this.prisma.task.findUnique({
      where: { id: payload.taskId },
      include: { assignee: true, creator: true },
    })
    if (!task) return
    const targets = new Set([task.assigneeId, task.creatorId].filter(Boolean) as string[])
    const label: Record<string, string> = {
      TODO: '待接单', IN_PROGRESS: '进行中', REVIEW: '待验收', DONE: '已完成',
    }
    for (const uid of targets) {
      await this.notifications.notify({
        userId: uid,
        type: 'task',
        title: `任务「${task.title}」→ ${label[payload.to] ?? payload.to}`,
        link: '/tasks',
      })
      this.server.to(`user:${uid}`).emit('notification:new', {
        type: 'task',
        title: `任务「${task.title}」→ ${label[payload.to] ?? payload.to}`,
        link: '/tasks',
      })
    }
  }

  /** 点子发布 → 全成员推送（创意池更新） */
  @OnEvent('idea.created')
  async onIdeaCreated(payload: CoreEventMap['idea.created']) {
    const idea = await this.prisma.idea.findUnique({ where: { id: payload.ideaId }, select: { title: true } })
    if (!idea) return
    this.server.to('all').emit('notification:new', {
      type: 'idea',
      title: `新点子：「${idea.title}」`,
      link: '/ideas',
    })
  }

  /** 🟡-9：所有通知（评论/点赞/@提及/匹配/审批/bot）实时推送到目标用户 */
  @OnEvent('notification.created')
  async onNotificationCreated(payload: {
    userId: string
    notification: { id: string; type: string; title: string; content: string | null; link: string | null }
  }) {
    const { userId, notification } = payload
    this.server.to(`user:${userId}`).emit('notification:new', notification)
    this.server.to(`user:${userId}`).emit('notification:unread', { count: 'refresh' })
  }

  /** 通用 @提及/评论/点赞 → 目标用户推送（由 notification:new 事件承载） */
  async pushToUser(userId: string, data: { type: string; title: string; link?: string }) {
    this.server.to(`user:${userId}`).emit('notification:new', data)
  }
}
