import { createRouter, createWebHistory } from 'vue-router'
import { uiContributions } from '../ui/manifest'
import { composeUi } from '../ui/contribution'

// 组合全部能力包的 UI 贡献
const { menu, routes } = composeUi(uiContributions)

// 给能力包路由补面包屑 title（顶栏显示）
const titledRoutes = routes.map((r) => {
  const menuItem = menu.find((m) => m.path === r.path)
  return { ...r, meta: { title: menuItem?.label ?? '' } }
})

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('../views/HomeView.vue'), meta: { title: '工作台' } },
    { path: '/login', name: 'login', component: () => import('../views/LoginView.vue'), meta: { title: '登录' } },
    { path: '/register', name: 'register', component: () => import('../views/RegisterView.vue'), meta: { title: '注册' } },
    // —— 能力包路由（自动合并）——
    ...titledRoutes,
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  document.title = title ? `${title} · CyberSWAT 开发部` : 'CyberSWAT 开发部'
})

export { menu }
