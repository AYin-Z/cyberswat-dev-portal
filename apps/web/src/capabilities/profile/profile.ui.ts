import type { UiContribution } from '../../ui/contribution'
import ProfileView from './ProfileView.vue'

/** 个人资料 UI 声明（内核能力，与后端 core/users + core/skills 对应） */
export const profileUi: UiContribution = {
  pluginId: 'core.profile',
  menu: [{ path: '/profile', label: '资料', icon: 'PersonOutline' }],
  routes: [{ path: '/profile', name: 'profile', component: ProfileView }],
}
