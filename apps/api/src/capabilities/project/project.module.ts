import { Module, OnModuleInit } from '@nestjs/common'
import { ProjectService } from './project.service'
import { ProjectController } from './project.controller'
import { PluginRegistry } from '../../core/plugins/plugin.registry'
import { PermissionsService } from '../../core/permissions/permissions.service'
import { manifest } from './project.manifest'

@Module({
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule implements OnModuleInit {
  constructor(
    private readonly service: ProjectService,
    private readonly plugins: PluginRegistry,
    private readonly permissions: PermissionsService,
  ) {}

  onModuleInit() {
    this.plugins.register(manifest)
    this.permissions.registerMany(manifest.permissions ?? [])
    this.service.init()
  }
}
