import { Injectable, Logger } from '@nestjs/common'
import type { PluginManifest } from '@cyberswat/shared'

/**
 * 插件注册表 — 内核的"插件行"收集器。
 * 对应 DSH/Cordis：profile = 插件行的叠加。能力包在模块初始化时 register()，
 * 内核据此获得该插件的权限点/工具/事件/UI 声明。
 *
 * L0 阶段：编译期注册（代码级插件）。
 * L1 阶段：可改为读 DB plugins 表按配置组装（接口不变）。
 */
@Injectable()
export class PluginRegistry {
  private readonly logger = new Logger(PluginRegistry.name)
  private readonly manifests = new Map<string, PluginManifest>()

  register(manifest: PluginManifest): void {
    if (this.manifests.has(manifest.id)) {
      this.logger.warn(`[plugin] ${manifest.id} 重复注册，忽略`)
      return
    }
    this.manifests.set(manifest.id, manifest)
    this.logger.log(
      `[plugin] ${manifest.id}@${manifest.version} 已注册 ` +
        `(权限:${manifest.permissions?.length ?? 0} 工具:${manifest.tools?.length ?? 0} ` +
        `事件:${manifest.events?.length ?? 0} deps:${manifest.deps?.join(',') ?? '-'})`,
    )
  }

  /** 列出全部已注册插件（管理界面/诊断用） */
  list(): PluginManifest[] {
    return [...this.manifests.values()]
  }

  /** 查询单个插件 */
  get(id: string): PluginManifest | undefined {
    return this.manifests.get(id)
  }

  /** 插件是否已注册 */
  has(id: string): boolean {
    return this.manifests.has(id)
  }
}
