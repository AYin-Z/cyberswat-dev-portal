import type { PluginManifest } from '@cyberswat/shared'

/**
 * 点子墙能力包 manifest — "点子→人力"连接机制（PRD 构思 #4）。
 */
export const manifest: PluginManifest = {
  id: 'dev.idea-wall',
  version: '0.1.0',
  deps: ['core.notification'],
  permissions: [
    { id: 'idea.view', description: '查看点子墙', defaultRoles: ['member', 'dept-leader', 'admin'] },
    { id: 'idea.post', description: '发布点子', defaultRoles: ['member', 'dept-leader', 'admin'] },
    { id: 'idea.join', description: '申请加入点子', defaultRoles: ['member', 'dept-leader', 'admin'] },
    { id: 'idea.promote', description: '点子转正/归档', defaultRoles: ['dept-leader', 'admin'] },
  ],
  tools: ['idea.search', 'idea.create'],
  events: ['idea.created', 'idea.promoted'],
  ui: {
    routes: ['/ideas', '/ideas/new'],
    menu: ['点子墙'],
    slots: ['home.cards'],
  },
  dbNamespace: 'idea_wall',
}
