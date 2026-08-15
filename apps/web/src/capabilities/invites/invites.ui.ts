import type { UiContribution } from '../../ui/contribution'
import InvitesView from './InvitesView.vue'

/** 邀请管理 UI 声明（内核能力，与后端 core/invites 对应） */
export const invitesUi: UiContribution = {
  pluginId: 'core.invites',
  menu: [{ path: '/invites', label: '邀请' }],
  routes: [{ path: '/invites', name: 'invites', component: InvitesView }],
}
