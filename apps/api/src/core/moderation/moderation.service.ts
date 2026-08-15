import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../core/db/prisma.service'
import { NotificationService } from '../../core/notifications/notification.service'

export type TargetType = 'post' | 'comment' | 'idea' | 'announcement'

/**
 * 内容治理（P5）— 举报队列 + 软删除。
 * 删除权：作者本人（自己的内容）+ dept-leader/admin（任何内容，软删留审计）。
 * 举报权：所有登录成员 → PENDING 队列 → 部长处置（RESOLVED=删除 / DISMISSED=忽略）。
 */
@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  /** 提交举报 */
  async report(targetType: TargetType, targetId: string, reason: string, reporterId: string): Promise<void> {
    await this.prisma.coreReport.create({
      data: { targetType, targetId, reason: reason.slice(0, 200), reporterId },
    })
    // 通知部长（处置入口）
    const leaders = await this.prisma.coreUser.findMany({
      where: { role: { in: ['DEPT_LEADER', 'ADMIN'] } },
      select: { id: true },
    })
    for (const l of leaders) {
      await this.notifications.notify({
        userId: l.id,
        type: 'report',
        title: `收到举报：${targetType} #${targetId.slice(0, 8)}`,
        content: reason,
        link: '/moderation',
      })
    }
    this.logger.log(`[mod] 举报 ${targetType}#${targetId.slice(0, 8)} by ${reporterId}: ${reason.slice(0, 40)}`)
  }

  /** 软删除（作者本人或部长）；marker = 删除标记文本 */
  async remove(targetType: TargetType, targetId: string, actorId: string, actorRole: string): Promise<void> {
    const canManage = actorRole === 'admin' || actorRole === 'dept-leader'
    const MARKER = '[已删除]'
    const MARKER_CONTENT = '(内容已被删除)'

    const resolveTarget = async () => {
      switch (targetType) {
        case 'post':
          return this.prisma.post.findUnique({ where: { id: targetId }, select: { authorId: true } })
        case 'comment':
          return this.prisma.postComment.findUnique({ where: { id: targetId }, select: { authorId: true } })
        case 'idea':
          return this.prisma.idea.findUnique({ where: { id: targetId }, select: { authorId: true } })
        case 'announcement':
          return this.prisma.announcement.findUnique({ where: { id: targetId }, select: { authorId: true } })
      }
    }

    const target = await resolveTarget()
    if (!target) throw new NotFoundException('目标不存在')
    if (!canManage && target.authorId !== actorId) {
      throw new ForbiddenException('只能删除自己的内容（或联系部长）')
    }

    switch (targetType) {
      case 'post':
        await this.prisma.post.update({ where: { id: targetId }, data: { deletedAt: new Date() } })
        break
      case 'comment':
        await this.prisma.postComment.update({ where: { id: targetId }, data: { deletedAt: new Date() } })
        break
      case 'idea':
        await this.prisma.idea.update({ where: { id: targetId }, data: { title: MARKER, description: MARKER_CONTENT } })
        break
      case 'announcement':
        await this.prisma.announcement.update({ where: { id: targetId }, data: { title: MARKER, content: MARKER_CONTENT } })
        break
    }
    // 关联举报自动结案
    await this.prisma.coreReport.updateMany({
      where: { targetType, targetId, status: 'PENDING' },
      data: { status: 'RESOLVED', resolvedBy: actorId, resolvedAt: new Date() },
    })
    this.logger.log(`[mod] ${targetType}#${targetId.slice(0, 8)} 删除 by ${actorId}`)
  }

  /** 举报队列（部长） */
  async listReports(actorRole: string) {
    if (actorRole !== 'admin' && actorRole !== 'dept-leader') {
      throw new ForbiddenException('仅部长可查看举报队列')
    }
    return this.prisma.coreReport.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: 100,
    })
  }

  /** 处置举报：RESOLVED（转删除）/ DISMISSED（忽略） */
  async resolveReport(reportId: string, action: 'RESOLVED' | 'DISMISSED', actorId: string, actorRole: string) {
    if (actorRole !== 'admin' && actorRole !== 'dept-leader') {
      throw new ForbiddenException('仅部长可处置举报')
    }
    const report = await this.prisma.coreReport.findUnique({ where: { id: reportId } })
    if (!report) throw new NotFoundException('举报不存在')
    if (report.status !== 'PENDING') throw new BadRequestException('该举报已处置')

    await this.prisma.coreReport.update({
      where: { id: reportId },
      data: { status: action, resolvedBy: actorId, resolvedAt: new Date() },
    })
    if (action === 'RESOLVED') {
      await this.remove(report.targetType as TargetType, report.targetId, actorId, actorRole)
    }
    this.logger.log(`[mod] 举报 ${reportId} → ${action} by ${actorId}`)
  }
}
