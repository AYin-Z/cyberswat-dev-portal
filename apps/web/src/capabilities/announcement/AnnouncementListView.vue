<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthStore } from '../../stores/auth'

interface AnnouncementItem {
  id: string
  title: string
  content: string
  important: boolean
  publishedAt: string | null
  author: { id: string; nickname: string }
  read: boolean
  confirmed: boolean
}

const auth = useAuthStore()
const items = ref<AnnouncementItem[]>([])
const error = ref('')

async function load() {
  const res = await fetch('/api/announcements', {
    headers: { Authorization: `Bearer ${auth.token}` },
  })
  if (!res.ok) {
    error.value = `加载失败: ${res.status}`
    return
  }
  items.value = (await res.json()) as AnnouncementItem[]
}

onMounted(load)

async function open(a: AnnouncementItem) {
  await fetch(`/api/announcements/${a.id}`, {
    headers: { Authorization: `Bearer ${auth.token}` },
  })
  await load()
}

async function confirm(a: AnnouncementItem) {
  await fetch(`/api/announcements/${a.id}/confirm`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth.token}` },
  })
  await load()
}
</script>

<template>
  <section>
    <h1 class="title">公告</h1>
    <p v-if="error" class="error">{{ error }}</p>
    <RouterLink to="/announcements/new" class="new-btn">＋ 发布公告</RouterLink>
    <div class="list">
      <article v-for="a in items" :key="a.id" class="item" @click="open(a)">
        <span v-if="a.important" class="badge">重要</span>
        <span v-if="!a.read" class="dot" title="未读" />
        <h3>{{ a.title }}</h3>
        <p class="meta">
          {{ a.author.nickname }} · {{ a.publishedAt?.slice(0, 16).replace('T', ' ') }}
          <span v-if="a.important && !a.confirmed" class="confirm-hint">（待确认收到）</span>
        </p>
      </article>
      <p v-if="!items.length && !error" class="empty">暂无公告</p>
    </div>
  </section>
</template>

<style scoped>
.title { font-size: 22px; margin-bottom: 16px; }
.new-btn { display: inline-block; margin-bottom: 16px; color: var(--accent); text-decoration: none; font-size: 14px; }
.list { display: flex; flex-direction: column; gap: 10px; }
.item { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 14px 16px; cursor: pointer; position: relative; }
.item:hover { border-color: var(--accent); }
.item h3 { font-size: 15px; margin-bottom: 6px; }
.meta { color: var(--muted); font-size: 12px; }
.badge { color: #d29922; border: 1px solid #d29922; font-size: 11px; padding: 1px 6px; border-radius: 999px; margin-right: 8px; }
.dot { position: absolute; top: 16px; right: 16px; width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }
.confirm-hint { color: #d29922; }
.empty { color: var(--muted); font-size: 14px; }
.error { color: #f85149; font-size: 13px; margin-bottom: 12px; }
</style>
