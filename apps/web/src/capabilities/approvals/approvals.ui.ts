import type { UiContribution } from '../../ui/contribution'
import ApprovalsView from './ApprovalsView.vue'

/** 审批工作台 UI 声明（R2-D） */
export const approvalsUi: UiContribution = {
  pluginId: 'core.approvals',
  menu: [{ path: '/approvals', label: '审批', roles: ['dept-leader', 'admin'] }],
  routes: [{ path: '/approvals', name: 'approvals', component: ApprovalsView }],
}
