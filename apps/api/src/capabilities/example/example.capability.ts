import { Injectable, OnModuleInit } from '@nestjs/common'
import { PluginRegistry } from '../../core/plugins/plugin.registry'
import { PermissionsService } from '../../core/permissions/permissions.service'
import { ToolRegistry, type ToolCallContext } from '../../core/tools/tool.registry'
import { EventBus } from '../../core/events/event-bus'
import { manifest } from './example.manifest'

/**
 * 示例能力包 — 插件化架构的最小模板。
 * 演示能力包的标准骨架：manifest 注册 + 权限点注册 + 工具注册 + 事件订阅。
 * 后续公告/点子墙/社区/任务等能力包照此模式复制。
 */
@Injectable()
export class ExampleCapability implements OnModuleInit {
  constructor(
    private readonly plugins: PluginRegistry,
    private readonly permissions: PermissionsService,
    private readonly tools: ToolRegistry,
    private readonly events: EventBus,
  ) {}

  onModuleInit() {
    // 1. 注册插件清单
    this.plugins.register(manifest)

    // 2. 注册权限点
    this.permissions.registerMany(manifest.permissions ?? [])

    // 3. 注册工具
    this.tools.register(
      { id: 'example.ping', description: '示例：回声工具，返回传入的消息', params: { message: { type: 'string', description: '任意消息' } } },
      async (params: unknown) => ({ pong: (params as { message?: string }).message ?? 'pong' }),
    )
    this.tools.register(
      {
        id: 'example.dangerous',
        description: '示例：危险工具，agent 调用需部长审批',
        params: { action: { type: 'string', description: '要执行的动作' } },
        requiresApproval: true,
      },
      async (params: unknown) => ({ done: `执行了 ${(params as { action?: string }).action ?? 'nothing'}` }),
    )

    // 4. 订阅事件（能力包间的解耦协作示例）
    this.events.on('user.created', ({ userId }) => {
      console.log(`[example] 新用户 ${userId}，示例能力包已感知`)
    })
  }
}
