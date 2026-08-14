import { Body, Controller, Get, Param, Post } from '@nestjs/common'
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

  /** 审批记录查询（调试/审计） */
  @Get('audit')
  audit() {
    return this.registry.auditLog()
  }
}
