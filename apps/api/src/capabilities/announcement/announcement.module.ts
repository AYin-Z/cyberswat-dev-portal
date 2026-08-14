import { Module, OnModuleInit } from '@nestjs/common'
import { AnnouncementService } from './announcement.service'
import { AnnouncementController } from './announcement.controller'
import { PluginRegistry } from '../../core/plugins/plugin.registry'
import { PermissionsService } from '../../core/permissions/permissions.service'
import { manifest } from './announcement.manifest'

@Module({
  controllers: [AnnouncementController],
  providers: [AnnouncementService],
  exports: [AnnouncementService],
})
export class AnnouncementModule implements OnModuleInit {
  constructor(
    private readonly service: AnnouncementService,
    private readonly plugins: PluginRegistry,
    private readonly permissions: PermissionsService,
  ) {}

  onModuleInit() {
    // 插件化装配：manifest 注册 + 权限点注册 + 工具注册
    this.plugins.register(manifest)
    this.permissions.registerMany(manifest.permissions ?? [])
    this.service.init()
  }
}
