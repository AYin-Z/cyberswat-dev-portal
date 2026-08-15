import type { PluginManifest } from '@cyberswat/shared'

/**
 * 项目与任务能力包 manifest — 信息流转三件套之"任务执行" + 点子孵化。
 */
export const manifest: PluginManifest = {
  id: 'dev.project',
  version: '0.1.0',
  deps: ['core.notification'],
  permissions: [
    { id: 'project.view', description: '查看项目', defaultRoles: ['member', 'dept-leader', 'admin'] },
    { id: 'project.promote', description: '点子转正为项目', defaultRoles: ['dept-leader', 'admin'] },
    { id: 'project.manage', description: '项目管理（成员/归档）', defaultRoles: ['dept-leader', 'admin'] },
    { id: 'task.view', description: '查看任务', defaultRoles: ['member', 'dept-leader', 'admin'] },
    { id: 'task.assign', description: '创建/指派/验收任务', defaultRoles: ['dept-leader', 'admin'] },
    { id: 'task.work', description: '认领/提交任务', defaultRoles: ['member', 'dept-leader', 'admin'] },
  ],
  tools: ['task.list', 'task.create'],
  events: ['task.status.changed', 'idea.promoted'],
  ui: {
    routes: ['/projects', '/projects/:id', '/tasks'],
    menu: ['项目', '任务'],
    slots: ['home.cards'],
  },
  dbNamespace: 'project',
}
