import type { UiContribution } from '../../ui/contribution'
import AnnouncementListView from './AnnouncementListView.vue'
import AnnouncementNewView from './AnnouncementNewView.vue'

/** 公告能力包 UI 声明 — 与后端 manifest (dev.announcement) 对齐 */
export const announcementUi: UiContribution = {
  pluginId: 'dev.announcement',
  menu: [{ path: '/announcements', label: '公告', icon: 'MegaphoneOutline' }],
  routes: [
    { path: '/announcements', name: 'announcements', component: AnnouncementListView },
    { path: '/announcements/new', name: 'announcement-new', component: AnnouncementNewView },
  ],
}
