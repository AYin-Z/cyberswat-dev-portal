import type { UiContribution } from '../../ui/contribution'
import ProjectListView from './ProjectListView.vue'
import ProjectDetailView from './ProjectDetailView.vue'
import TaskBoardView from './TaskBoardView.vue'

/** 项目与任务能力包 UI 声明 — 与后端 manifest (dev.project) 对齐 */
export const projectUi: UiContribution = {
  pluginId: 'dev.project',
  menu: [
    { path: '/projects', label: '项目', icon: 'FolderOpenOutline' },
    { path: '/tasks', label: '任务', icon: 'CheckmarkDoneOutline' },
  ],
  routes: [
    { path: '/projects', name: 'projects', component: ProjectListView },
    { path: '/projects/:id', name: 'project-detail', component: ProjectDetailView, meta: { title: '项目详情' } },
    { path: '/tasks', name: 'tasks', component: TaskBoardView },
  ],
}
