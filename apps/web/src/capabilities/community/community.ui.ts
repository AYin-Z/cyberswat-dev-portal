import type { UiContribution } from '../../ui/contribution'
import PostListView from './PostListView.vue'
import PostDetailView from './PostDetailView.vue'
import PostNewView from './PostNewView.vue'

/** 社区能力包 UI 声明 — 与后端 manifest (dev.community) 对齐 */
export const communityUi: UiContribution = {
  pluginId: 'dev.community',
  menu: [{ path: '/posts', label: '社区' }],
  routes: [
    { path: '/posts', name: 'posts', component: PostListView },
    { path: '/posts/new', name: 'post-new', component: PostNewView },
    { path: '/posts/:id', name: 'post-detail', component: PostDetailView },
  ],
}
