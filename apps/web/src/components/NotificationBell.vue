<script setup lang="ts">
import { io, type Socket } from 'socket.io-client'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { api } from '../lib/api'

const auth = useAuthStore()
const unread = ref(0)
const list = ref<{ id: string; type: string; title: string; content: string | null; link: string | null; read: boolean; createdAt: string }[]>([])
const open = ref(false)
let sock: Socket | null = null

function connect() {
  if (!auth.token) return
  sock = io('/', {
    path: '/socket.io',
    auth: { token: auth.token },
  })
  sock.on('notification:unread', (d: { count: number }) => {
    unread.value = d.count
  })
  sock.on('notification:new', (d: { id?: string; type: string; title: string; content?: string | null; link?: string | null; read?: boolean; createdAt?: string }) => {
    unread.value += 1
    list.value.unshift({
      id: d.id ?? `live-${Date.now()}`,
      type: d.type,
      title: d.title,
      content: d.content ?? null,
      link: d.link ?? null,
      read: d.read ?? false,
      createdAt: d.createdAt ?? new Date().toISOString(),
    })
    // 🟡-8：通知不强制改 URL（仅提供跳转链接）
  })
  sock.on('notification:list', (rows: typeof list.value) => {
    list.value = rows
  })
}

async function toggle() {
  open.value = !open.value
  if (open.value && sock) {
    sock.emit('notification:fetch')
  }
}

async function markAll() {
  try {
    await api('/api/notifications/read', { method: 'POST' })
    unread.value = 0
    list.value = list.value.map((n) => ({ ...n, read: true }))
  } catch {
    /* 静默失败：下轮未读事件会修正状态 */
  }
}

// 🟢-6：点击面板外部关闭
const wrapEl = ref<HTMLElement | null>(null)
function onDocClick(e: MouseEvent) {
  if (wrapEl.value && !wrapEl.value.contains(e.target as Node)) open.value = false
}

onMounted(() => {
  connect()
  document.addEventListener('click', onDocClick)
})
onBeforeUnmount(() => {
  sock?.disconnect()
  document.removeEventListener('click', onDocClick)
})
</script>

<template>
  <div ref="wrapEl" class="bell-wrap">
    <button class="bell" aria-label="通知" :aria-expanded="open" @click="toggle">
      🔔<span v-if="unread > 0" class="count" aria-hidden="true">{{ unread > 99 ? '99+' : unread }}</span>
    </button>
    <div v-if="open" class="panel" role="menu" aria-label="通知列表">
      <div class="panel-head">
        <span>通知</span>
        <button class="clear" @click="markAll">全部已读</button>
      </div>
      <div v-for="n in list" :key="n.id" class="item" :class="{ unread: !n.read }" @click="n.link && ($router.push(n.link), open = false)">
        <p class="n-title">{{ n.title }}</p>
        <p v-if="n.content" class="n-content">{{ n.content }}</p>
        <p class="n-meta">{{ n.type }} · {{ n.createdAt.slice(0, 16).replace('T', ' ') }}</p>
      </div>
      <p v-if="!list.length" class="empty">暂无通知</p>
    </div>
  </div>
</template>

<style scoped>
/* 🔴-1 修复：旧变量体系（--fg/--panel/--border/--muted/--accent）从未定义 → 全部改用 --cs-* */
.bell-wrap { position: relative; }
.bell { background: none; border: none; font-size: 16px; cursor: pointer; position: relative; color: var(--cs-ink); }
.bell:focus-visible { outline: 2px solid var(--cs-accent); outline-offset: 2px; }
.count { position: absolute; top: -6px; right: -10px; background: var(--cs-danger); color: var(--cs-canvas); font-size: 12px; font-weight: 600; border-radius: 999px; padding: 1px 5px; }
.panel { position: absolute; right: 0; top: 32px; width: 320px; max-width: calc(100vw - 32px); max-height: 420px; overflow-y: auto; background: var(--cs-surface-2); border: 1px solid var(--cs-hairline); border-radius: 8px; z-index: 100; box-shadow: var(--cs-shadow-raised, 0 8px 24px rgba(0,0,0,0.4)); }
.panel-head { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid var(--cs-hairline); font-size: 13px; font-weight: 600; }
.clear { background: none; border: none; color: var(--cs-accent); font-size: 12px; cursor: pointer; }
.clear:hover { color: var(--cs-accent-hover); }
.item { padding: 10px 14px; border-bottom: 1px solid var(--cs-hairline); cursor: pointer; }
.item:hover { background: var(--cs-surface-3); }
.item.unread { background: color-mix(in srgb, var(--cs-accent) 8%, transparent); }
.item.unread:hover { background: color-mix(in srgb, var(--cs-accent) 14%, var(--cs-surface-3)); }
.n-title { font-size: 13px; }
.n-content { color: var(--cs-ink-subtle); font-size: 12px; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.n-meta { color: var(--cs-ink-subtle); font-size: 12px; margin-top: 4px; }
.empty { padding: 20px; text-align: center; color: var(--cs-ink-subtle); font-size: 13px; }
</style>
