import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { PrismaService } from '../../core/db/prisma.service'
import { NotificationService } from '../../core/notifications/notification.service'

const DAILY_MATCH_LIMIT = 3 // 每人每天匹配通知上限（P2）

/**
 * 点子→成员匹配引擎（P2 人力匹配闭环）。
 * 触发：idea.created 事件 → techStack ∩ skills（技术级交集）→ 定向通知 top-N。
 * 约束：排除发起人/已加入者；每人每天 ≤3 条；allowMatch=false 不进匹配池；幂等。
 */
@Injectable()
export class IdeaMatchService {
  private readonly logger = new Logger(IdeaMatchService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  @OnEvent('idea.created')
  async onIdeaCreated(payload: { ideaId: string }) {
    try {
      await this.match(payload.ideaId)
    } catch (err) {
      this.logger.error(`[match] 匹配失败: ${err instanceof Error ? err.message : err}`)
    }
  }

  async match(ideaId: string): Promise<number> {
    const idea = await this.prisma.idea.findUnique({
      where: { id: ideaId },
      include: { joiners: { select: { userId: true } } },
    })
    if (!idea) return 0
    if (!idea.techStack.length) return 0

    const exclude = new Set([idea.authorId, ...idea.joiners.map((j) => j.userId)])
    // 候选：活跃 + 开启匹配 + 有技能的人
    const candidates = await this.prisma.coreUser.findMany({
      where: { active: true, allowMatch: true, skills: { isEmpty: false } },
      select: { id: true, nickname: true, skills: true },
    })

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    let notified = 0
    for (const c of candidates) {
      if (exclude.has(c.id)) continue
      const overlap = c.skills.filter((s) => idea.techStack.includes(s))
      if (!overlap.length) continue

      // 每人每天 ≤3 条（P2 频率限制）
      const todayCount = await this.prisma.notification.count({
        where: { userId: c.id, type: 'idea-match', createdAt: { gte: todayStart } },
      })
      if (todayCount >= DAILY_MATCH_LIMIT) continue

      await this.notifications.notify({
        userId: c.id,
        type: 'idea-match',
        title: `你会的 ${overlap.join('/')} 正是点子「${idea.title}」缺的`,
        content: idea.need,
        link: `/ideas/${idea.id}`,
      })
      notified++
    }
    if (notified > 0) {
      this.logger.log(`[match] 点子 ${idea.title} 匹配通知 ${notified} 位成员`)
    }
    return notified
  }
}
