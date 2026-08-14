import { Controller, Get } from '@nestjs/common'
import { Public } from './permissions/permission.decorator'
import { PluginRegistry } from './plugins/plugin.registry'

/** 健康检查 + 内核诊断（插件列表/权限点/工具清单） */
@Controller('health')
export class HealthController {
  constructor(private readonly pluginRegistry: PluginRegistry) {}

  @Public()
  @Get()
  health() {
    return { status: 'ok', kernel: 'cyberswat-dev-api', time: new Date().toISOString() }
  }

  @Public()
  @Get('plugins')
  pluginList() {
    return this.pluginRegistry.list().map((p) => ({
      id: p.id,
      version: p.version,
      permissions: p.permissions?.length ?? 0,
      tools: p.tools?.length ?? 0,
      events: p.events?.length ?? 0,
    }))
  }
}
