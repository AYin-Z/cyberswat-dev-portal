import { Body, Controller, ForbiddenException, Get, Param, Post } from '@nestjs/common'
import { Authorize } from '../permissions/permission.decorator'
import { ToolRegistry, type ToolCallContext } from './tool.registry'
import { CurrentUser, type AuthUser } from '../permissions/permission.decorator'

/**
 * 工具 HTTP 入口 — 人工/内部服务调用工具的通道（与 agent 走同一 ToolRegistry）。
 * L1 增加 MCP 端点后，MCP 与 HTTP 共用同一注册表与审计。
 */
@Controller('tools')
export class ToolsController {
  constructor(private readonly registry: ToolRegistry) {}

  /** 列出当前角色可见的工具 */
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.registry.listFor(user.role).map((t) => ({
      id: t.id,
      description: t.description,
      requiresApproval: t.requiresApproval ?? false,
    }))
  }

  /** 调用工具（人工调用可跳过审批 — skipApproval） */
  @Post(':id/call')
  call(
    @Param('id') id: string,
    @Body() body: { params: unknown },
    @CurrentUser() user: AuthUser,
  ) {
    const ctx: ToolCallContext = { caller: user.id, role: user.role }
    return this.registry.call(id, body.params, ctx, { skipApproval: true })
  }

  /** 审批记录查询（🔴-3：仅部长） */
  @Authorize('audit.view')
  @Get('audit')
  audit() {
    return this.registry.auditLog()
  }

  /** 待审批队列（🔴-3：仅部长处置：agent 危险操作） */
  @Authorize('audit.view')
  @Get('pending')
  pending() {
    return this.registry.pendingList()
  }

  /** 审批：批准/驳回 */
  @Post('pending/:recordId')
  resolve(@Param('recordId') recordId: string, @Body('approve') approve: boolean, @CurrentUser() user: AuthUser) {
    if (user.role !== 'dept-leader' && user.role !== 'admin') {
      throw new ForbiddenException('仅部长可审批')
    }
    this.registry.resolveApproval(recordId, approve === true, user.id)
    return { ok: true }
  }
}
