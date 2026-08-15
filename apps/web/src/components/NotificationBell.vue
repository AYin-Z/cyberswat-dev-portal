<script setup lang="ts">
import { io, type Socket } from 'socket.io-client'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useAuthStore } from '../stores/auth'

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
  await fetch('/api/notifications/read', { method: 'POST', headers: { Authorization: `Bearer ${auth.token}` } })
  unread.value = 0
  list.value = list.value.map((n) => ({ ...n, read: true }))
}

onMounted(connect)
onBeforeUnmount(() => sock?.disconnect())
</script>

<template>
  <div class="bell-wrap">
    <button class="bell" @click="toggle">
      🔔<span v-if="unread > 0" class="count">{{ unread > 99 ? '99+' : unread }}</span>
    </button>
    <div v-if="open" class="panel">
      <div class="panel-head">
        <span>通知</span>
        <button class="clear" @click="markAll">全部已读</button>
      </div>
      <div v-for="n in list" :key="n.id" class="item" :class="{ unread: !n.read }" @click="n.link && $router.push(n.link)">
        <p class="n-title">{{ n.title }}</p>
        <p v-if="n.content" class="n-content">{{ n.content }}</p>
        <p class="n-meta">{{ n.type }} · {{ n.createdAt.slice(0, 16).replace('T', ' ') }}</p>
      </div>
      <p v-if="!list.length" class="empty">暂无通知</p>
    </div>
  </div>
</template>

<style scoped>
.bell-wrap { position: relative; }
.bell { background: none; border: none; font-size: 16px; cursor: pointer; position: relative; color: var(--fg); }
.count { position: absolute; top: -6px; right: -10px; background: #f85149; color: #fff; font-size: 10px; border-radius: 999px; padding: 1px 5px; }
.panel { position: absolute; right: 0; top: 32px; width: 320px; max-height: 420px; overflow-y: auto; background: var(--panel); border: 1px solid var(--border); border-radius: 8px; z-index: 100; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
.panel-head { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid var(--border); font-size: 13px; font-weight: 600; }
.clear { background: none; border: none; color: var(--accent); font-size: 12px; cursor: pointer; }
.item { padding: 10px 14px; border-bottom: 1px solid var(--border); }
.item.unread { background: rgba(88, 166, 255, 0.06); }
.n-title { font-size: 13px; }
.n-content { color: var(--muted); font-size: 12px; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.n-meta { color: var(--muted); font-size: 11px; margin-top: 4px; }
.empty { padding: 20px; text-align: center; color: var(--muted); font-size: 13px; }
</style>
