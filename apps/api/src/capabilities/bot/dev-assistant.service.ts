import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { PrismaService } from '../../core/db/prisma.service'
import { ToolRegistry, type ToolCallContext } from '../../core/tools/tool.registry'

const BOT_NAME = 'dev-assistant'
const BOT_IDENTITY = 'bot:dev-assistant'

/**
 * 内置 bot（R2-A）— 社区嵌入式：成员在帖子/评论中 @dev-assistant 触发。
 * 回复策略（无外部 LLM 依赖，模板 + 工具调用实时数据）：
 *   - 解析 @提及后的内容 → 匹配工具（查公告/点子/任务/帖子）
 *   - 调用 ToolRegistry（只读工具；写工具一律审批，bot 不直接写）
 *   - 以 bot 身份发评论回复（authorViaAgent=true，前端 🤖 角标）
 *   - persona 存 core_agents（可配置），未来接 LLM 时替换 reply() 实现
 */
@Injectable()
export class DevAssistantBot {
  private readonly logger = new Logger(DevAssistantBot.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly tools: ToolRegistry,
  ) {}

  /** 初始化：确保 bot 用户 + agent 配置存在（幂等） */
  async ensure() {
    const existing = await this.prisma.coreAgent.findUnique({ where: { name: BOT_NAME } })
    if (existing) return

    // bot 用户（无密码，active）
    const user = await this.prisma.coreUser.upsert({
      where: { email: `${BOT_IDENTITY}@cyberswat.local` },
      update: {},
      create: {
        email: `${BOT_IDENTITY}@cyberswat.local`,
        passwordHash: 'bot:no-password',
        nickname: '开发部助理',
        role: 'MEMBER',
        active: true,
        bio: 'CyberSWAT 开发部 AI 助理 — @我 可查公告/点子/任务/社区',
      },
    })
    await this.prisma.coreAgent.create({
      data: {
        name: BOT_NAME,
        displayName: '开发部助理',
        persona: '你是 CyberSWAT 开发部助理。回答要简洁、只基于工具返回的真实数据，不编造。写操作必须走审批。',
        identity: BOT_IDENTITY,
        userId: user.id,
        tools: [], // 空 = 继承 member 级可见工具
        enabled: true,
      },
    })
    this.logger.log(`[bot] ${BOT_IDENTITY} 初始化完成 (userId=${user.id})`)
  }

  /** 订阅评论/帖子创建：检测 @dev-assistant → 回复 */
  @OnEvent('bot.mention')
  async onMention(payload: { content: string; postId: string; byUserId: string; commentId?: string }) {
    // 🟢-15：确保 bot 用户已初始化（幂等）
    await this.ensure()
    const agent = await this.prisma.coreAgent.findUnique({ where: { name: BOT_NAME } })
    if (!agent?.enabled) return

    const text = payload.content
    // 触发词：@dev-assistant / @开发部助理 / @助理
    const mentionRe = /@(dev-assistant|开发部助理|助理)/
    if (!mentionRe.test(text)) return
    // 去掉触发词，取询问内容
    const question = text.replace(mentionRe, '').trim()
    if (!question) {
      await this.reply(payload.postId, '在的！@我 可以问：最近公告 / 招募中的点子 / 任务进展 / 社区帖子', payload.commentId, payload.byUserId)
      return
    }

    const answer = await this.answer(question, payload.byUserId)
    await this.reply(payload.postId, answer, payload.commentId, payload.byUserId)
  }

  /** 回答：关键词 → 工具调用 → 摘要（模板引擎） */
  private async answer(question: string, byUserId: string): Promise<string> {
    const ctx: ToolCallContext = { caller: BOT_IDENTITY, role: 'member', agentId: BOT_IDENTITY }
    const q = question.toLowerCase()

    try {
      if (/公告|通知/.test(q)) {
        const r = await this.tools.call('announcement.list', { limit: 5 }, ctx) as { title: string; important?: boolean; publishedAt?: string | null }[]
        if (!r.length) return '目前没有公告。'
        return '最近公告：\n' + r.map((a) => `• ${a.title}${a.important ? '（重要）' : ''}`).join('\n')
      }
      if (/点子|招募/.test(q)) {
        const r = await this.tools.call('idea.search', { status: 'RECRUITING', limit: 5 }, ctx) as { title: string; need: string }[]
        if (!r.length) return '目前没有招募中的点子。'
        return '招募中的点子：\n' + r.map((i) => `• ${i.title} — ${i.need}`).join('\n')
      }
      if (/任务|进展/.test(q)) {
        const r = await this.tools.call('task.list', { limit: 5 }, ctx) as { title: string; status: string }[]
        if (!r.length) return '目前没有任务。'
        return '最近任务：\n' + r.map((t) => `• ${t.title}（${t.status}）`).join('\n')
      }
      if (/帖子|社区/.test(q)) {
        const r = await this.tools.call('post.search', { limit: 5 }, ctx) as { title: string; board: string }[]
        if (!r.length) return '社区还没有帖子。'
        return '社区最近：\n' + r.map((p) => `• [${p.board}] ${p.title}`).join('\n')
      }
      return '我可以帮你查：公告 / 招募中的点子 / 任务进展 / 社区帖子。试试 @dev-assistant 最近公告？'
    } catch (err) {
      this.logger.error(`[bot] 回答失败: ${err instanceof Error ? err.message : err}`)
      return '查询失败了，稍后再试，或联系部长。'
    }
  }

  /** 以 bot 身份回复（🟡-11：authorViaAgent 结构化标识；🟡-10：通知发起人） */
  private async reply(postId: string, content: string, replyToCommentId?: string, byUserId?: string) {
    const agent = await this.prisma.coreAgent.findUnique({ where: { name: BOT_NAME } })
    if (!agent?.userId) return
    const comment = await this.prisma.postComment.create({
      data: {
        postId,
        authorId: agent.userId,
        content: `${content}\n\n— 🤖 ${agent.displayName}`,
        authorViaAgent: true,
      },
    })
    // 🟡-10：通知 @ 发起人
    if (byUserId && byUserId !== agent.userId) {
      await this.prisma.notification.create({
        data: {
          userId: byUserId,
          type: 'bot',
          title: `${agent.displayName} 回复了你的消息`,
          content: content.slice(0, 60),
          link: `/posts/${postId}`,
        },
      })
    }
    this.logger.log(`[bot] 已回复帖子 ${postId.slice(0, 8)} (comment ${comment.id.slice(0, 8)})`)
  }
}
