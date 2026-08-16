import type { UiContribution } from '../../ui/contribution'
import AgentView from './AgentView.vue'

/** Agent 接入页 UI 声明（R2-C） */
export const agentUi: UiContribution = {
  pluginId: 'core.agent',
  menu: [{ path: '/agent', label: 'Agent', icon: 'ServerOutline' }],
  routes: [{ path: '/agent', name: 'agent', component: AgentView }],
}
