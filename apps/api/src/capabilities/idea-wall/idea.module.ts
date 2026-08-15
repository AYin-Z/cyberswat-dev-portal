import { Module, OnModuleInit } from '@nestjs/common'
import { IdeaService } from './idea.service'
import { IdeaController } from './idea.controller'
import { PluginRegistry } from '../../core/plugins/plugin.registry'
import { PermissionsService } from '../../core/permissions/permissions.service'
import { manifest } from './idea.manifest'

@Module({
  controllers: [IdeaController],
  providers: [IdeaService],
  exports: [IdeaService],
})
export class IdeaModule implements OnModuleInit {
  constructor(
    private readonly service: IdeaService,
    private readonly plugins: PluginRegistry,
    private readonly permissions: PermissionsService,
  ) {}

  onModuleInit() {
    this.plugins.register(manifest)
    this.permissions.registerMany(manifest.permissions ?? [])
    this.service.init()
  }
}
