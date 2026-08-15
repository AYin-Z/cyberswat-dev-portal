import { Module, OnModuleInit } from '@nestjs/common'
import { CommunityService } from './community.service'
import { CommunityController } from './community.controller'
import { PluginRegistry } from '../../core/plugins/plugin.registry'
import { PermissionsService } from '../../core/permissions/permissions.service'
import { manifest } from './community.manifest'

@Module({
  controllers: [CommunityController],
  providers: [CommunityService],
  exports: [CommunityService],
})
export class CommunityModule implements OnModuleInit {
  constructor(
    private readonly service: CommunityService,
    private readonly plugins: PluginRegistry,
    private readonly permissions: PermissionsService,
  ) {}

  onModuleInit() {
    this.plugins.register(manifest)
    this.permissions.registerMany(manifest.permissions ?? [])
    this.service.init()
  }
}
