import type { PluginManifest } from '@cyberswat/shared'

/**
 * 公告能力包 manifest — 第一个真实业务能力包。
 * 覆盖：公告发布（部长）/ 已读追踪 / 重要公告确认 / agent 工具。
 */
export const manifest: PluginManifest = {
  id: 'dev.announcement',
  version: '0.1.0',
  deps: ['core.notification'],
  permissions: [
    { id: 'announcement.view', description: '查看公告', defaultRoles: ['member', 'dept-leader', 'admin'] },
    { id: 'announcement.publish', description: '发布/编辑/删除公告', defaultRoles: ['dept-leader', 'admin'] },
    { id: 'announcement.readers', description: '查看已读/未读名单', defaultRoles: ['dept-leader', 'admin'] },
  ],
  tools: ['announcement.list', 'announcement.publish'],
  events: ['announcement.published'],
  ui: {
    routes: ['/announcements'],
    menu: ['公告'],
    slots: ['home.cards'],
  },
  dbNamespace: 'announcement',
}
