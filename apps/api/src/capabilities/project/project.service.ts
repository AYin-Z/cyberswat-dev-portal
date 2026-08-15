import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ProjectStatus, TaskPriority, TaskStatus } from '@prisma/client'
import { EventBus } from '../../core/events/event-bus'
import { PrismaService } from '../../core/db/prisma.service'
import { ToolRegistry, type ToolCallContext } from '../../core/tools/tool.registry'

export interface ProjectView {
  id: string
  name: string
  description: string
  difficulty: string | null
  techStack: string[]
  status: ProjectStatus
  needPeople: string | null
  lead: { id: string; nickname: string }
  ideaId: string | null
  repoUrl: string | null
  memberCount: number
  taskCount: number
  doneTaskCount: number
  createdAt: string
}

export interface TaskView {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  dueAt: string | null
  projectId: string | null
  projectName: string | null
  assignee: { id: string; nickname: string } | null
  creator: { id: string; nickname: string }
  submitNote: string | null
  createdAt: string
}

/**
 * 项目与任务服务 — M3 任务闭环：指派→接单→提交→验收。
 * 点子转正（PROMOTED）时创建正式项目并关联（PRD 构思 #5 孵化机制）。
 */
@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBus,
    private readonly tools: ToolRegistry,
  ) {}

  /** 能力包初始化：注册工具 */
  init() {
    this.tools.register(
      {
        id: 'task.list',
        description: '列出任务（按状态/指派人），供 agent 了解任务流转情况',
        params: {
          status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'], description: '按状态筛选' },
          assigneeId: { type: 'string', description: '按指派人筛选' },
          limit: { type: 'number', description: '条数上限，默认 20' },
        },
        requiredPermission: 'task.view',
      },
      async (params: unknown, ctx: ToolCallContext) => {
        const p = params as { status?: TaskStatus; assigneeId?: string; limit?: number }
        const rows = await this.prisma.task.findMany({
          where: { ...(p.status ? { status: p.status } : {}), ...(p.assigneeId ? { assigneeId: p.assigneeId } : {}) },
          include: { assignee: { select: { id: true, nickname: true } }, project: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: Math.min(p.limit ?? 20, 50),
        })
        return rows.map((r) => ({ id: r.id, title: r.title, status: r.status, priority: r.priority, dueAt: r.dueAt?.toISOString() ?? null, assignee: r.assignee?.nickname ?? null, project: r.project?.name ?? null }))
      },
    )
    this.tools.register(
      {
        id: 'task.create',
        description: '创建任务并指派（agent 代部长操作，需审批）',
        params: {
          title: { type: 'string', description: '任务标题' },
          description: { type: 'string', description: '任务描述' },
          assigneeId: { type: 'string', description: '被指派人用户 id' },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], description: '优先级' },
          dueAt: { type: 'string', description: '截止时间 ISO' },
          projectId: { type: 'string', description: '挂靠项目 id（可选）' },
        },
        requiredPermission: 'task.assign',
        requiresApproval: true,
      },
      async (params: unknown, ctx: ToolCallContext) => {
        const p = params as { title: string; description?: string; assigneeId?: string; priority?: TaskPriority; dueAt?: string; projectId?: string }
        const task = await this.create(ctx.caller, {
          title: p.title,
          description: p.description,
          assigneeId: p.assigneeId,
          priority: p.priority,
          dueAt: p.dueAt ? new Date(p.dueAt) : undefined,
          projectId: p.projectId,
        })
        return { id: task.id, title: task.title, status: task.status }
      },
    )
    this.logger.log('[project] 工具注册完成')
  }

  // ============ 项目 ============

  /** 点子转正 → 创建项目（部长操作，M3 孵化机制核心） */
  async promoteIdea(ideaId: string, leadId: string, data: { name?: string; difficulty?: string; repoUrl?: string }): Promise<ProjectView> {
    const idea = await this.prisma.idea.findUnique({ where: { id: ideaId } })
    if (!idea) throw new NotFoundException('点子不存在')
    if (idea.status === 'PROMOTED') throw new BadRequestException('点子已转正')

    const project = await this.prisma.project.create({
      data: {
        name: data.name ?? idea.title,
        description: idea.description,
        difficulty: data.difficulty,
        techStack: idea.techStack,
        needPeople: idea.need,
        leadId,
        ideaId: idea.id,
        repoUrl: data.repoUrl,
      },
      include: {
        lead: { select: { id: true, nickname: true } },
        members: true,
        tasks: true,
      },
    })
    // 点子状态更新 + 关联
    await this.prisma.idea.update({
      where: { id: ideaId },
      data: { status: 'PROMOTED', promotedProjectId: project.id },
    })
    // 点子加入者自动成为项目成员；负责人入成员表（LEAD）
    const joiners = await this.prisma.ideaJoiner.findMany({ where: { ideaId } })
    await this.prisma.projectMember.create({ data: { projectId: project.id, userId: leadId, role: 'LEAD' } })
    if (joiners.length) {
      await this.prisma.projectMember.createMany({
        data: joiners.map((j) => ({ projectId: project.id, userId: j.userId })),
        skipDuplicates: true,
      })
    }
    // 点子发起人成为项目成员（若非负责人）
    if (idea.authorId !== leadId) {
      await this.prisma.projectMember.create({ data: { projectId: project.id, userId: idea.authorId } })
    }
    this.events.emit('idea.promoted', { ideaId, projectId: project.id })
    this.logger.log(`[project] 点子 ${ideaId} 转正 → 项目 "${project.name}" (负责人 ${leadId})`)
    return this.toProjectView(project)
  }

  async listProjects(): Promise<ProjectView[]> {
    const rows = await this.prisma.project.findMany({
      include: {
        lead: { select: { id: true, nickname: true } },
        members: true,
        tasks: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((r) => this.toProjectView(r))
  }

  async projectDetail(id: string) {
    const row = await this.prisma.project.findUnique({
      where: { id },
      include: {
        lead: { select: { id: true, nickname: true } },
        members: { include: { user: { select: { id: true, nickname: true, skills: true } } } },
        tasks: { include: { assignee: { select: { id: true, nickname: true } }, creator: { select: { id: true, nickname: true } }, project: { select: { name: true } } }, orderBy: { createdAt: 'desc' } },
      },
    })
    if (!row) throw new NotFoundException('项目不存在')
    return {
      ...this.toProjectView(row),
      members: row.members.map((m) => ({ id: m.user.id, nickname: m.user.nickname, skills: m.user.skills, role: m.role })),
      tasks: row.tasks.map((t) => this.toTaskView(t)),
    }
  }

  async addMember(projectId: string, userId: string): Promise<void> {
    await this.prisma.projectMember.create({ data: { projectId, userId } })
  }

  // ============ 任务 ============

  /** 创建任务（部长/负责人），可选指派 */
  async create(
    creatorId: string,
    data: {
      title: string
      description?: string
      assigneeId?: string
      priority?: TaskPriority
      dueAt?: Date
      projectId?: string
    },
  ): Promise<TaskView> {
    const task = await this.prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        assigneeId: data.assigneeId,
        priority: data.priority ?? 'MEDIUM',
        dueAt: data.dueAt,
        projectId: data.projectId,
        creatorId,
      },
      include: {
        assignee: { select: { id: true, nickname: true } },
        creator: { select: { id: true, nickname: true } },
        project: { select: { name: true } },
      },
    })
    this.logger.log(`[task] "${task.title}" 创建 by ${creatorId} (assignee=${data.assigneeId ?? '无'})`)
    if (data.assigneeId) {
      this.events.emit('task.status.changed', { taskId: task.id, from: 'CREATED', to: task.status })
    }
    return this.toTaskView(task)
  }

  /** 接单（被指派人或任意成员认领 TODO 任务） */
  async claim(taskId: string, userId: string): Promise<TaskView> {
    const task = await this.prisma.task.findUnique({ where: { id: taskId }, include: { assignee: true } })
    if (!task) throw new NotFoundException('任务不存在')
    if (task.status !== 'TODO') throw new BadRequestException('仅待接单任务可认领')
    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: { status: 'IN_PROGRESS', assigneeId: task.assigneeId ?? userId },
      include: { assignee: { select: { id: true, nickname: true } }, creator: { select: { id: true, nickname: true } }, project: { select: { name: true } } },
    })
    this.events.emit('task.status.changed', { taskId, from: 'TODO', to: 'IN_PROGRESS' })
    return this.toTaskView(updated)
  }

  /** 提交（完成工作，进入待验收） */
  async submit(taskId: string, userId: string, note?: string): Promise<TaskView> {
    const task = await this.prisma.task.findUnique({ where: { id: taskId }, include: { assignee: true } })
    if (!task) throw new NotFoundException('任务不存在')
    if (task.status !== 'IN_PROGRESS') throw new BadRequestException('仅进行中的任务可提交')
    if (task.assigneeId && task.assigneeId !== userId) throw new BadRequestException('仅被指派人可提交')
    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: { status: 'REVIEW', submitNote: note },
      include: { assignee: { select: { id: true, nickname: true } }, creator: { select: { id: true, nickname: true } }, project: { select: { name: true } } },
    })
    this.events.emit('task.status.changed', { taskId, from: 'IN_PROGRESS', to: 'REVIEW' })
    return this.toTaskView(updated)
  }

  /** 验收（创建者/部长）：通过 → DONE；驳回 → 回到 IN_PROGRESS */
  async review(taskId: string, userId: string, approve: boolean): Promise<TaskView> {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } })
    if (!task) throw new NotFoundException('任务不存在')
    if (task.status !== 'REVIEW') throw new BadRequestException('仅待验收任务可评审')
    if (task.creatorId !== userId) throw new BadRequestException('仅任务创建者可验收')
    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: { status: approve ? 'DONE' : 'IN_PROGRESS' },
      include: { assignee: { select: { id: true, nickname: true } }, creator: { select: { id: true, nickname: true } }, project: { select: { name: true } } },
    })
    this.events.emit('task.status.changed', { taskId, from: 'REVIEW', to: approve ? 'DONE' : 'IN_PROGRESS' })
    this.logger.log(`[task] ${taskId} 验收${approve ? '通过' : '驳回'} by ${userId}`)
    return this.toTaskView(updated)
  }

  /** 任务列表（按状态/指派人/项目筛选） */
  async listTasks(opts?: { status?: TaskStatus; assigneeId?: string; projectId?: string }): Promise<TaskView[]> {
    const rows = await this.prisma.task.findMany({
      where: {
        ...(opts?.status ? { status: opts.status } : {}),
        ...(opts?.assigneeId ? { assigneeId: opts.assigneeId } : {}),
        ...(opts?.projectId ? { projectId: opts.projectId } : {}),
      },
      include: { assignee: { select: { id: true, nickname: true } }, creator: { select: { id: true, nickname: true } }, project: { select: { name: true } } },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 100,
    })
    return rows.map((r) => this.toTaskView(r))
  }

  private toProjectView(r: {
    id: string
    name: string
    description: string
    difficulty: string | null
    techStack: string[]
    status: ProjectStatus
    needPeople: string | null
    lead: { id: string; nickname: string }
    ideaId: string | null
    repoUrl: string | null
    createdAt: Date
    members: unknown[]
    tasks: unknown[]
  }): ProjectView {
    const done = (r.tasks as { status: string }[]).filter((t) => t.status === 'DONE').length
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      difficulty: r.difficulty,
      techStack: r.techStack,
      status: r.status,
      needPeople: r.needPeople,
      lead: r.lead,
      ideaId: r.ideaId,
      repoUrl: r.repoUrl,
      memberCount: r.members.length,
      taskCount: r.tasks.length,
      doneTaskCount: done,
      createdAt: r.createdAt.toISOString(),
    }
  }

  private toTaskView(r: {
    id: string
    title: string
    description: string | null
    status: TaskStatus
    priority: TaskPriority
    dueAt: Date | null
    projectId: string | null
    project: { name: string } | null
    assignee: { id: string; nickname: string } | null
    creator: { id: string; nickname: string }
    submitNote: string | null
    createdAt: Date
  }): TaskView {
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      status: r.status,
      priority: r.priority,
      dueAt: r.dueAt?.toISOString() ?? null,
      projectId: r.projectId,
      projectName: r.project?.name ?? null,
      assignee: r.assignee,
      creator: r.creator,
      submitNote: r.submitNote,
      createdAt: r.createdAt.toISOString(),
    }
  }
}
