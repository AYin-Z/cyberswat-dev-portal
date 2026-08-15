import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common'
import type { ToolDefinition, ToolCallRecord, Role } from '@cyberswat/shared'
import { EventBus } from '../events/event-bus'
import { PermissionsService } from '../permissions/permissions.service'
import { PrismaService } from '../db/prisma.service'
import { NotificationService } from '../notifications/notification.service'

/** 工具执行上下文 — 调用者身份（用户或 agent） */
export interface ToolCallContext {
  /** 用户 id 或 bot:<agent-id> */
  caller: string
  role: Role
  agentId?: string
}

/**
 * 工具注册表 + 执行管道。
 * 对应 DSH dsh-tools（"Tool registry and execution pipeline"）：
 *  - scope：requiredPermission 决定对谁可见（agent 白名单/角色）
 *  - approval：requiresApproval 的工具进入审批队列（agent 永不越权）
 *  - policy：审计铁律（默认全记录）
 *
 * 能力包注册工具 → agent/HTTP 调用 → 权限校验 → (审批) → 执行 → 审计
 */
@Injectable()
export class ToolRegistry {
  private readonly logger = new Logger(ToolRegistry.name)
  private readonly tools = new Map<string, ToolDefinition>()
  private readonly handlers = new Map<string, (params: unknown, ctx: ToolCallContext) => Promise<unknown>>()
  private readonly records: ToolCallRecord[] = []

  constructor(
    private readonly events: EventBus,
    private readonly permissions: PermissionsService,
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  /** 能力包注册工具 */
  register(
    def: ToolDefinition,
    handler: (params: unknown, ctx: ToolCallContext) => Promise<unknown>,
  ): void {
    if (this.tools.has(def.id)) {
      this.logger.warn(`[tool] ${def.id} 重复注册，忽略`)
      return
    }
    this.tools.set(def.id, def)
    this.handlers.set(def.id, handler)
    this.logger.log(
      `[tool] ${def.id}${def.requiresApproval ? ' [需审批]' : ''}${def.agentCallable === false ? ' [禁agent]' : ''}`,
    )
  }

  /** 列出工具（按角色可见性过滤 — 对应 DSH 的 scoped context per agent） */
  listFor(role: Role): ToolDefinition[] {
    return [...this.tools.values()].filter(
      (t) => !t.requiredPermission || this.permissions.has(role, t.requiredPermission),
    )
  }

  /** 全量工具（MCP 用：可见性完全由 token scope 决定） */
  listAll(): ToolDefinition[] {
    return [...this.tools.values()]
  }

  /** 调用工具（agent 与内部服务共用入口） */
  async call(
    toolId: string,
    params: unknown,
    ctx: ToolCallContext,
    opts?: { skipApproval?: boolean; skipRoleCheck?: boolean },
  ): Promise<unknown> {
    const def = this.tools.get(toolId)
    if (!def) throw new BadRequestException(`工具不存在: ${toolId}`)

    // scope 检查：角色可见性（MCP 调用时 scope 已由 token 校验，跳过）
    if (!opts?.skipRoleCheck && def.requiredPermission && !this.permissions.has(ctx.role, def.requiredPermission)) {
      throw new ForbiddenException(`无权调用工具: ${toolId}`)
    }
    // agent 调用限制
    if (ctx.agentId && def.agentCallable === false) {
      throw new ForbiddenException(`工具 ${toolId} 不允许 agent 调用`)
    }

    const record: ToolCallRecord = {
      id: crypto.randomUUID(),
      toolId,
      caller: ctx.caller,
      agentId: ctx.agentId,
      params,
      status: 'ok',
      createdAt: new Date().toISOString(),
    }
    ;(record as ToolCallRecord & { role?: Role }).role = ctx.role

    // approval：危险工具需人工审批（agent 调用时）
    if (def.requiresApproval && ctx.agentId && !opts?.skipApproval) {
      record.status = 'pending'
      this.records.push(record)
      this.events.emit('tool.approval.requested', { record })
      // 🟡-4：通知部长（审批工作台入口）
      this.notifyLeaders(`待审批：${toolId}`, `agent ${ctx.agentId?.slice(0, 12)} 请求执行 ${toolId}`)
      this.logger.warn(`[tool] ${toolId} 等待审批 (caller=${ctx.caller})`)
      return { status: 'pending', recordId: record.id, message: '工具调用等待人工审批' }
    }

    try {
      const result = await this.handlers.get(toolId)!(params, ctx)
      record.result = result
      if (def.audit !== false) {
        this.records.push(record)
        await this.persist(record)
      }
      return result
    } catch (err) {
      record.status = 'error'
      record.result = err instanceof Error ? err.message : String(err)
      if (def.audit !== false) {
        this.records.push(record)
        await this.persist(record)
      }
      throw err
    }
  }

  /** 审批：部长/管理员处理 pending 调用；通过时执行原调用 */
  async resolveApproval(recordId: string, approved: boolean, approver: string): Promise<void> {
    const record = this.records.find((r) => r.id === recordId && r.status === 'pending')
    if (!record) throw new BadRequestException(`审批记录不存在: ${recordId}`)
    if (!approved) {
      record.status = 'rejected'
      record.approvedBy = approver
      this.events.emit('tool.approval.resolved', { recordId, approved })
      await this.persist(record)
      this.logger.log(`[tool] ${record.toolId} 审批驳回 by ${approver}`)
      return
    }
    // 通过：执行原调用（caller 为原请求者；角色检查跳过——scope 已授权）
    try {
      const result = await this.handlers.get(record.toolId)!(
        record.params,
        { caller: record.caller, role: (record as ToolCallRecord & { role?: Role }).role ?? 'member', agentId: record.agentId },
      )
      record.result = result
      record.status = 'ok'
      record.approvedBy = approver
      this.events.emit('tool.approval.resolved', { recordId, approved })
      await this.persist(record)
      this.logger.log(`[tool] ${record.toolId} 审批通过并执行 by ${approver}`)
    } catch (err) {
      record.status = 'error'
      record.result = err instanceof Error ? err.message : String(err)
      record.approvedBy = approver
      await this.persist(record)
      this.logger.error(`[tool] ${record.toolId} 审批后执行失败: ${err instanceof Error ? err.message : err}`)
    }
  }

  /** 审计查询（管理员/审计用） */
  auditLog(): ToolCallRecord[] {
    return [...this.records]
  }

  /** 🟡-4：通知部长/管理员 */
  private async notifyLeaders(title: string, content: string) {
    try {
      const leaders = await this.prisma.coreUser.findMany({
        where: { role: { in: ['DEPT_LEADER', 'ADMIN'] } },
        select: { id: true },
      })
      for (const l of leaders) {
        await this.notifications.notify({
          userId: l.id,
          type: 'approval',
          title,
          content,
          link: '/approvals',
        })
      }
    } catch (err) {
      this.logger.error(`[tool] 审批通知失败: ${err instanceof Error ? err.message : err}`)
    }
  }

  /** 审计/审批落库（🔴-3：core_tool_calls 表，重启不丢） */
  private async persist(record: ToolCallRecord) {
    try {
      await this.prisma.coreToolCall.create({
        data: {
          toolId: record.toolId,
          caller: record.caller,
          agentId: record.agentId,
          params: record.params as object,
          result: record.result as object | undefined,
          status: record.status,
          approvedBy: record.approvedBy,
        },
      })
    } catch (err) {
      this.logger.error(`[tool] 审计落库失败: ${err instanceof Error ? err.message : err}`)
    }
  }

  /** 待审批队列（审批工作台 R2-D） */
  pendingList(): ToolCallRecord[] {
    return this.records.filter((r) => r.status === 'pending')
  }
}
