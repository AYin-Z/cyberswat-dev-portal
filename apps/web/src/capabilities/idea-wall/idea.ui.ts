import type { UiContribution } from '../../ui/contribution'
import IdeaListView from './IdeaListView.vue'
import IdeaDetailView from './IdeaDetailView.vue'
import IdeaNewView from './IdeaNewView.vue'

/** 点子墙能力包 UI 声明 — 与后端 manifest (dev.idea-wall) 对齐 */
export const ideaUi: UiContribution = {
  pluginId: 'dev.idea-wall',
  menu: [{ path: '/ideas', label: '点子墙' }],
  routes: [
    { path: '/ideas', name: 'ideas', component: IdeaListView },
    { path: '/ideas/new', name: 'idea-new', component: IdeaNewView },
    { path: '/ideas/:id', name: 'idea-detail', component: IdeaDetailView },
  ],
}
