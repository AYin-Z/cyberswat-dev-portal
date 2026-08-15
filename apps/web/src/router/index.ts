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

// 路由守卫（🔴-8）：受保护页未登录 → /login
const publicPaths = ['/login', '/register']
router.beforeEach((to) => {
  const token = localStorage.getItem('dev_token')
  if (!token && !publicPaths.includes(to.path)) {
    return { path: '/login', query: { next: to.fullPath } }
  }
  if (token && publicPaths.includes(to.path)) {
    return { path: '/' }
  }
  return true
})

router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  document.title = title ? `${title} · CyberSWAT 开发部` : 'CyberSWAT 开发部'
})

export { menu }
