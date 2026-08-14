import { createRouter, createWebHistory } from 'vue-router'
import { uiContributions } from '../ui/manifest'
import { composeUi } from '../ui/contribution'

// 组合全部能力包的 UI 贡献
const { menu, routes } = composeUi(uiContributions)

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('../views/HomeView.vue') },
    { path: '/login', name: 'login', component: () => import('../views/LoginView.vue') },
    // —— 能力包路由（自动合并）——
    ...routes,
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  document.title = title ? `${title} · CyberSWAT 开发部` : 'CyberSWAT 开发部'
})

export { menu }
