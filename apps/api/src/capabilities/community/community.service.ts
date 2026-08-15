import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PostBoard } from '@prisma/client'
import { EventBus } from '../../core/events/event-bus'
import { PrismaService } from '../../core/db/prisma.service'
import { NotificationService } from '../../core/notifications/notification.service'
import { ToolRegistry } from '../../core/tools/tool.registry'

export interface PostView {
  id: string
  board: PostBoard
  title: string
  content: string
  author: { id: string; nickname: string }
  commentCount: number
  likeCount: number
  liked: boolean
  createdAt: string
}

/**
 * 轻量社区服务 — PRD 构思 #6：帖子+评论+点赞+@通知。
 * 板块：灌水/求助/分享/招人；公网可见列表（后续），登录可交互。
 */
@Injectable()
export class CommunityService {
  private readonly logger = new Logger(CommunityService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBus,
    private readonly notifications: NotificationService,
    private readonly tools: ToolRegistry,
  ) {}

  init() {
    this.tools.register(
      {
        id: 'post.search',
        description: '搜索社区帖子（按板块/关键词），供 agent 了解成员讨论',
        params: {
          board: { type: 'string', enum: ['GENERAL', 'HELP', 'SHARE', 'RECRUIT'], description: '板块' },
          keyword: { type: 'string', description: '关键词' },
          limit: { type: 'number', description: '条数上限，默认 20' },
        },
        requiredPermission: 'post.view',
      },
      async (params: unknown) => {
        const p = params as { board?: PostBoard; keyword?: string; limit?: number }
        const rows = await this.prisma.post.findMany({
          where: {
            ...(p.board ? { board: p.board } : {}),
            ...(p.keyword ? { OR: [{ title: { contains: p.keyword } }, { content: { contains: p.keyword } }] } : {}),
          },
          include: { author: { select: { nickname: true } }, _count: { select: { comments: true, likes: true } } },
          orderBy: { createdAt: 'desc' },
          take: Math.min(p.limit ?? 20, 50),
        })
        return rows.map((r) => ({ id: r.id, board: r.board, title: r.title, author: r.author.nickname, comments: r._count.comments, likes: r._count.likes }))
      },
    )
    this.logger.log('[community] 工具注册完成')
  }

  // ============ 帖子 ============

  /** 帖子列表（板块筛选） */
  async listPosts(viewerId: string, board?: PostBoard): Promise<PostView[]> {
    const rows = await this.prisma.post.findMany({
      where: board ? { board } : undefined,
      include: {
        author: { select: { id: true, nickname: true } },
        _count: { select: { comments: true, likes: true } },
        likes: { where: { userId: viewerId }, select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return rows.map((r) => ({
      id: r.id,
      board: r.board,
      title: r.title,
      content: r.content,
      author: r.author,
      commentCount: r._count.comments,
      likeCount: r._count.likes,
      liked: r.likes.length > 0,
      createdAt: r.createdAt.toISOString(),
    }))
  }

  /** 发帖（解析 @提及 → 通知） */
  async createPost(authorId: string, data: { board: PostBoard; title: string; content: string }): Promise<PostView> {
    const post = await this.prisma.post.create({
      data: { board: data.board, title: data.title, content: data.content, authorId },
      include: {
        author: { select: { id: true, nickname: true } },
        _count: { select: { comments: true, likes: true } },
        likes: { where: { userId: authorId }, select: { id: true } },
      },
    })
    await this.handleMentions(data.content, authorId, post.id, undefined)
    this.logger.log(`[community] 帖子 "${post.title}" by ${authorId} (${data.board})`)
    return this.toPostView(post, false)
  }

  /** 帖子详情 + 评论 */
  async postDetail(postId: string, viewerId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: { select: { id: true, nickname: true } },
        _count: { select: { comments: true, likes: true } },
        likes: { where: { userId: viewerId }, select: { id: true } },
        comments: {
          include: { author: { select: { id: true, nickname: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!post) throw new NotFoundException('帖子不存在')
    return {
      ...this.toPostView(post, post.likes.length > 0),
      comments: post.comments.map((c) => ({
        id: c.id,
        content: c.content,
        author: c.author,
        createdAt: c.createdAt.toISOString(),
      })),
    }
  }

  /** 评论（@提及 → 通知） */
  async addComment(postId: string, authorId: string, content: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } })
    if (!post) throw new NotFoundException('帖子不存在')
    const comment = await this.prisma.postComment.create({
      data: { postId, authorId, content },
      include: { author: { select: { id: true, nickname: true } } },
    })
    // 通知帖子作者（自己评论自己不算）
    if (post.authorId !== authorId) {
      await this.notifications.notify({
        userId: post.authorId,
        type: 'comment',
        title: `有人在「${post.title}」下评论了你`,
        content,
        link: `/posts/${postId}`,
      })
    }
    await this.handleMentions(content, authorId, postId, comment.id)
    return { id: comment.id, content: comment.content, author: comment.author, createdAt: comment.createdAt.toISOString() }
  }

  /** 点赞/取消点赞 */
  async toggleLike(postId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    const post = await this.prisma.post.findUnique({ where: { id: postId } })
    if (!post) throw new NotFoundException('帖子不存在')
    const existing = await this.prisma.postLike.findUnique({ where: { postId_userId: { postId, userId } } })
    if (existing) {
      await this.prisma.postLike.delete({ where: { id: existing.id } })
      return { liked: false, likeCount: await this.prisma.postLike.count({ where: { postId } }) }
    }
    await this.prisma.postLike.create({ data: { postId, userId } })
    if (post.authorId !== userId) {
      await this.notifications.notify({
        userId: post.authorId,
        type: 'like',
        title: '有人赞了你的帖子',
        content: post.title,
        link: `/posts/${postId}`,
      })
    }
    return { liked: true, likeCount: await this.prisma.postLike.count({ where: { postId } }) }
  }

  // ============ @提及 ============

  /** 解析 @昵称 并通知（在帖子/评论内容中匹配） */
  private async handleMentions(content: string, byUserId: string, postId: string, commentId?: string): Promise<void> {
    const regex = /@([\u4e00-\u9fa5\w-]{2,20})/g
    const matches = [...content.matchAll(regex)]
    if (!matches.length) return
    const names = [...new Set(matches.map((m) => m[1]))]
    const users = await this.prisma.coreUser.findMany({
      where: { nickname: { in: names }, active: true },
      select: { id: true, nickname: true },
    })
    for (const u of users) {
      if (u.id === byUserId) continue
      await this.prisma.notificationMention.create({
        data: { postId, commentId: commentId ?? null, mentionedUserId: u.id, byUserId },
      })
      await this.notifications.notify({
        userId: u.id,
        type: 'mention',
        title: `有人 @了你`,
        content: content.slice(0, 60),
        link: commentId ? `/posts/${postId}` : `/posts/${postId}`,
      })
      this.logger.log(`[community] @${u.nickname} 被提及 (by ${byUserId})`)
    }
  }

  private toPostView(
    r: {
      id: string
      board: PostBoard
      title: string
      content: string
      author: { id: string; nickname: string }
      _count: { comments: number; likes: number }
      createdAt: Date
    },
    liked: boolean,
  ): PostView {
    return {
      id: r.id,
      board: r.board,
      title: r.title,
      content: r.content,
      author: r.author,
      commentCount: r._count.comments,
      likeCount: r._count.likes,
      liked,
      createdAt: r.createdAt.toISOString(),
    }
  }
}
