<script setup lang="ts">
import { computed, h, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Component } from 'vue'
import { NConfigProvider, NLayout, NLayoutSider, NLayoutHeader, NLayoutContent, NMenu, NAvatar, NButton, NDropdown, NMessageProvider, NDialogProvider, darkTheme, zhCN, dateZhCN } from 'naive-ui'
import type { MenuOption } from 'naive-ui'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useUiStore } from './stores/ui'
import { useAuthStore } from './stores/auth'
import NotificationBell from './components/NotificationBell.vue'
import { themeOverrides } from './theme'
// 🟡-8：菜单图标统一 @vicons/ionicons5 线性集（替代 ⌂/⬡ 文本字形）
import {
  HomeOutline, MegaphoneOutline, ServerOutline, PeopleOutline, PersonOutline,
  CheckboxOutline, ChatbubblesOutline, BulbOutline, MailUnreadOutline,
  ShieldCheckmarkOutline, FolderOpenOutline, CheckmarkDoneOutline,
} from '@vicons/ionicons5'

const iconMap: Record<string, Component> = {
  HomeOutline, MegaphoneOutline, ServerOutline, PeopleOutline, PersonOutline,
  CheckboxOutline, ChatbubblesOutline, BulbOutline, MailUnreadOutline,
  ShieldCheckmarkOutline, FolderOpenOutline, CheckmarkDoneOutline,
}

const ui = useUiStore()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const collapsed = ref(false)

// 🟡-7：认证页（登录/注册）脱离应用壳，全屏干净画布
const isAuthPage = computed(() => route.path === '/login' || route.path === '/register')

// 🟡-1：窄屏默认折叠侧栏（用户仍可手动展开）
const isNarrow = ref(false)
function onResize() {
  isNarrow.value = window.innerWidth < 768
  if (isNarrow.value) collapsed.value = true
}
onMounted(() => {
  onResize()
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => window.removeEventListener('resize', onResize))

// 菜单：能力包 manifest 注入（ui.menu）+ 固定首页；🟡-2 按角色过滤（roles 省略 = 全员可见）；🟡-8 全项带图标
const menuOptions = computed<MenuOption[]>(() => [
  {
    label: () => h(RouterLink, { to: '/' }, { default: () => '首页' }),
    key: 'home',
    icon: () => h(iconMap.HomeOutline),
  },
  ...ui.menu
    .filter((m) => !m.roles || (auth.user?.role && m.roles.includes(auth.user.role)))
    .map((m) => {
      const icon = m.icon // 闭包内保持窄化，避免 TS2538
      return {
        label: () => h(RouterLink, { to: m.path }, { default: () => m.label }),
        key: m.path,
        icon: icon ? () => h(iconMap[icon] ?? HomeOutline) : undefined,
      }
    }),
])

// 当前激活菜单
const activeKey = computed(() => {
  if (route.path === '/') return 'home'
  const hit = ui.menu.find((m) => route.path.startsWith(m.path))
  return hit?.path ?? 'home'
})

// 用户菜单
const userOptions: MenuOption[] = [
  { label: '个人资料', key: 'profile' },
  { label: '退出登录', key: 'logout' },
]

function onUserSelect(key: string) {
  if (key === 'profile') {
    router.push('/profile')
  } else if (key === 'logout') {
    auth.logout()
    router.push('/login')
  }
}
</script>

<template>
  <n-config-provider :theme="darkTheme" :theme-overrides="themeOverrides" :locale="zhCN" :date-locale="dateZhCN">
    <n-message-provider><n-dialog-provider>
    <n-layout has-sider class="shell" :class="{ bare: isAuthPage }">
      <!-- 🟡-7：认证页（登录/注册）不渲染侧栏与顶栏，全屏干净画布 -->
      <n-layout-sider
        v-if="!isAuthPage"
        bordered
        collapse-mode="width"
        :collapsed-width="64"
        :width="220"
        :collapsed="collapsed"
        show-trigger="bar"
        @collapse="collapsed = true"
        @expand="collapsed = false"
      >
        <div class="brand" :class="{ mini: collapsed }">
          <span class="logo">⬡</span>
          <span v-if="!collapsed" class="name">CYBERSWAT<span class="dev">·DEV</span></span>
        </div>
        <n-menu :options="menuOptions" :value="activeKey" :collapsed="collapsed" :collapsed-width="64" />
        <div v-if="!collapsed" class="sider-foot">
          <!-- 🟢-9：侧栏身份信息收敛为版本号（顶栏已有身份+下拉） -->
          <span class="ver mono">dev · v1.2</span>
        </div>
      </n-layout-sider>

      <n-layout>
        <!-- 顶栏 -->
        <n-layout-header v-if="!isAuthPage" bordered class="topbar">
          <span class="crumb">{{ route.meta.title ?? '' }}</span>
          <div class="top-right">
            <notification-bell v-if="auth.isLoggedIn" />
            <n-dropdown v-if="auth.isLoggedIn" :options="userOptions" @select="onUserSelect">
              <n-button quaternary size="small" class="user-btn">
                <n-avatar round size="small" class="avatar">{{ (auth.user?.nickname ?? '?').slice(0, 1).toUpperCase() }}</n-avatar>
                <span class="nick">{{ auth.user?.nickname }}</span>
              </n-button>
            </n-dropdown>
            <n-button v-else quaternary size="small" @click="router.push('/login')">登录</n-button>
          </div>
        </n-layout-header>

        <!-- 内容区（🟢：1200px 居中；🟢：路由切换 150ms fade 过渡） -->
        <n-layout-content class="content" :class="{ bare: isAuthPage }">
          <RouterView v-slot="{ Component }">
            <transition name="page" mode="out-in">
              <component :is="Component" />
            </transition>
          </RouterView>
        </n-layout-content>
      </n-layout>
    </n-layout>
    </n-dialog-provider></n-message-provider>
  </n-config-provider>
</template>

<style scoped>
.shell {
  height: 100vh;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 20px;
  height: 56px;
  border-bottom: 1px solid var(--cs-hairline);
}
.brand.mini {
  padding: 0;
  justify-content: center;
}
.logo {
  color: var(--cs-accent);
  font-size: 18px;
  line-height: 1;
}
.name {
  font-weight: 700;
  letter-spacing: 1px;
  font-size: 14px;
  white-space: nowrap;
}
.dev {
  color: var(--cs-accent);
}
.sider-foot {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid var(--cs-hairline);
}
.ver {
  font-size: 12px;
  color: var(--cs-ink-subtle);
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 56px;
}
.crumb {
  font-size: 13px;
  color: var(--cs-ink-subtle);
}
.top-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.user-btn {
  display: flex;
  align-items: center;
  gap: 8px;
}
.avatar {
  background: var(--cs-surface-3);
  color: var(--cs-ink-muted);
  font-size: 12px;
}
.content {
  padding: 24px;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto; /* 🟢：宽屏内容居中（Linear 式） */
}
/* 🟡-7：认证页内容区全宽无内边距（auth 页面自带 100dvh 居中画布） */
.content.bare {
  max-width: none;
  padding: 0;
  margin: 0;
}
.shell.bare {
  background: var(--cs-canvas);
}

/* 🟢：路由切换 150ms fade 过渡（尊重 reduced-motion） */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.15s ease;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .page-enter-active,
  .page-leave-active {
    transition: none;
  }
}

/* 🟡-1：窄屏内容区缩小内边距 */
@media (max-width: 640px) {
  .content {
    padding: 16px;
  }
}
</style>
