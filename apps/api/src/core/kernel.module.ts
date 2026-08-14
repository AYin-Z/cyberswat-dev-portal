import { Module } from '@nestjs/common'
import { PluginsModule } from './plugins/plugins.module'
import { PermissionsModule } from './permissions/permissions.module'
import { EventsModule } from './events/events.module'
import { ToolsModule } from './tools/tools.module'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { HealthController } from './health.controller'
// 能力包（插件行）：新增能力包时在此追加 import + imports
import { ExampleModule } from '../capabilities/example/example.module'

/**
 * 内核 Kernel — 稳定骨架，不是插件。
 * 提供：插件注册表 / 权限点 / 事件总线 / 工具注册表 / 认证 / 用户
 * 能力包只能依赖这里导出的服务，不能反向依赖业务模块。
 */
@Module({
  imports: [
    PluginsModule,
    PermissionsModule,
    EventsModule,
    ToolsModule,
    AuthModule,
    UsersModule,
    // —— 能力包装配区 ——
    ExampleModule,
  ],
  controllers: [HealthController],
  exports: [PluginsModule, PermissionsModule, EventsModule, ToolsModule, AuthModule, UsersModule],
})
export class KernelModule {}
