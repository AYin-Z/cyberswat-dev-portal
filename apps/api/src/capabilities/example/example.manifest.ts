import type { PluginManifest } from '@cyberswat/shared'

/**
 * 示例能力包 manifest — 能力包声明的标准形态。
 * 对应 DSH cordis 插件行：id/version/deps + 权限点 + 工具 + 事件 + UI + 数据命名空间。
 */
export const manifest: PluginManifest = {
  id: 'dev.example',
  version: '0.1.0',
  deps: ['core.notification'],
  permissions: [
    { id: 'example.view', description: '查看示例内容', defaultRoles: ['member', 'dept-leader', 'admin'] },
    { id: 'example.danger', description: '执行示例危险操作', defaultRoles: ['dept-leader', 'admin'] },
  ],
  tools: ['example.ping', 'example.dangerous'],
  events: ['user.created'],
  ui: {
    routes: ['/example'],
    menu: ['示例'],
    slots: ['home.cards'],
  },
  dbNamespace: 'example',
}
