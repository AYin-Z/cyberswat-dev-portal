<script setup lang="ts">
import { useUiStore } from './stores/ui'
import { useAuthStore } from './stores/auth'

const ui = useUiStore()
const auth = useAuthStore()
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <span class="brand">CYBERSWAT<span class="accent">·DEV</span></span>
      <nav class="menu">
        <RouterLink v-for="item in ui.menu" :key="item.path" :to="item.path">
          {{ item.label }}
        </RouterLink>
      </nav>
      <div class="account">
        <span v-if="auth.user">@{{ auth.user.nickname }}</span>
        <RouterLink v-else to="/login">登录</RouterLink>
      </div>
    </header>
    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<style>
:root {
  --bg: #0d1117;
  --panel: #161b22;
  --border: #30363d;
  --fg: #e6edf3;
  --muted: #8b949e;
  --accent: #58a6ff;
}
* { box-sizing: border-box; margin: 0; }
body { background: var(--bg); color: var(--fg); font-family: system-ui, sans-serif; }
.shell { min-height: 100vh; display: flex; flex-direction: column; }
.topbar {
  display: flex; align-items: center; gap: 24px;
  padding: 12px 24px; border-bottom: 1px solid var(--border);
  background: var(--panel);
}
.brand { font-weight: 700; letter-spacing: 1px; }
.accent { color: var(--accent); }
.menu { display: flex; gap: 16px; flex: 1; }
.menu a { color: var(--muted); text-decoration: none; font-size: 14px; }
.menu a.router-link-active { color: var(--fg); }
.account a { color: var(--accent); text-decoration: none; }
.content { flex: 1; padding: 24px; max-width: 1080px; margin: 0 auto; width: 100%; }
</style>
