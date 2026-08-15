import type { UiContribution } from '../../ui/contribution'
import MembersView from './MembersView.vue'

/** 成员主页 UI 声明（内核能力，与后端 core/users 对应） */
export const membersUi: UiContribution = {
  pluginId: 'core.members',
  menu: [{ path: '/members', label: '成员' }],
  routes: [{ path: '/members', name: 'members', component: MembersView }],
}
