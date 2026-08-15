import type { UiContribution } from '../../ui/contribution'
import ModerationView from './ModerationView.vue'

/** 内容治理 UI 声明（内核能力，部长可见） */
export const moderationUi: UiContribution = {
  pluginId: 'core.moderation',
  menu: [{ path: '/moderation', label: '处置' }],
  routes: [{ path: '/moderation', name: 'moderation', component: ModerationView }],
}
