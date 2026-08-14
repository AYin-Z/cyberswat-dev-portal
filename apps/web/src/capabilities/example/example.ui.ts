import type { UiContribution } from '../../ui/contribution'
import ExampleView from './ExampleView.vue'

/** 示例能力包 UI 声明 — 与后端 manifest (dev.example) 对齐 */
export const exampleUi: UiContribution = {
  pluginId: 'dev.example',
  menu: [{ path: '/example', label: '示例' }],
  routes: [{ path: '/example', name: 'example', component: ExampleView }],
}
