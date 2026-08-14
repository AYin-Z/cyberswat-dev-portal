import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common'
import type { ToolDefinition, ToolCallRecord, Role } from '@cyberswat/shared'
import { EventBus } from '../events/event-bus'
import { PermissionsService } from '../permissions/permissions.service'

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

  /** 调用工具（agent 与内部服务共用入口） */
  async call(
    toolId: string,
    params: unknown,
    ctx: ToolCallContext,
    opts?: { skipApproval?: boolean },
  ): Promise<unknown> {
    const def = this.tools.get(toolId)
    if (!def) throw new BadRequestException(`工具不存在: ${toolId}`)

    // scope 检查：角色可见性
    if (def.requiredPermission && !this.permissions.has(ctx.role, def.requiredPermission)) {
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

    // approval：危险工具需人工审批（agent 调用时）
    if (def.requiresApproval && ctx.agentId && !opts?.skipApproval) {
      record.status = 'pending'
      this.records.push(record)
      this.events.emit('tool.approval.requested', { record })
      this.logger.warn(`[tool] ${toolId} 等待审批 (caller=${ctx.caller})`)
      return { status: 'pending', recordId: record.id, message: '工具调用等待人工审批' }
    }

    try {
      const result = await this.handlers.get(toolId)!(params, ctx)
      record.result = result
      if (def.audit !== false) this.records.push(record)
      return result
    } catch (err) {
      record.status = 'error'
      record.result = err instanceof Error ? err.message : String(err)
      if (def.audit !== false) this.records.push(record)
      throw err
    }
  }

  /** 审批：部长/管理员处理 pending 调用 */
  resolveApproval(recordId: string, approved: boolean, approver: string): void {
    const record = this.records.find((r) => r.id === recordId && r.status === 'pending')
    if (!record) throw new BadRequestException(`审批记录不存在: ${recordId}`)
    record.status = approved ? 'ok' : 'rejected'
    record.approvedBy = approver
    this.events.emit('tool.approval.resolved', { recordId, approved })
    this.logger.log(`[tool] ${record.toolId} 审批${approved ? '通过' : '驳回'} by ${approver}`)
  }

  /** 审计查询（管理员/审计用） */
  auditLog(): ToolCallRecord[] {
    return [...this.records]
  }
}
