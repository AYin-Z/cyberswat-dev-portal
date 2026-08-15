import type { PluginManifest } from '@cyberswat/shared'

/**
 * 轻量社区能力包 manifest — PRD 构思 #6。
 */
export const manifest: PluginManifest = {
  id: 'dev.community',
  version: '0.1.0',
  deps: ['core.notification'],
  permissions: [
    { id: 'post.view', description: '浏览社区', defaultRoles: ['member', 'dept-leader', 'admin'] },
    { id: 'post.create', description: '发帖', defaultRoles: ['member', 'dept-leader', 'admin'] },
    { id: 'post.comment', description: '评论/点赞', defaultRoles: ['member', 'dept-leader', 'admin'] },
  ],
  tools: ['post.search'],
  events: ['post.mentioned'],
  ui: {
    routes: ['/posts', '/posts/new'],
    menu: ['社区'],
    slots: ['home.cards'],
  },
  dbNamespace: 'community',
}
