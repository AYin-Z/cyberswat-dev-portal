<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthStore } from '../../stores/auth'
import PageHeader from '../../components/PageHeader.vue'
import EmptyState from '../../components/EmptyState.vue'
import { NTag, NSpin } from 'naive-ui'

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
const loading = ref(true)

async function load() {
  loading.value = true
  error.value = ''
  const res = await fetch('/api/announcements', {
    headers: { Authorization: `Bearer ${auth.token}` },
  })
  if (!res.ok) {
    error.value = `加载失败: ${res.status}`
    loading.value = false
    return
  }
  items.value = (await res.json()) as AnnouncementItem[]
  loading.value = false
}

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

onMounted(load)
</script>

<template>
  <section>
    <page-header title="公告" sub="发布与已读追踪 · 重要公告需确认收到">
      <template #actions>
        <RouterLink to="/announcements/new" class="new-link">＋ 发布公告</RouterLink>
      </template>
    </page-header>

    <p v-if="error" class="error">{{ error }}</p>
    <n-spin v-if="loading" class="spin" />

    <div v-else-if="items.length" class="list">
      <div v-for="a in items" :key="a.id" class="item" :class="{ unread: !a.read }" @click="open(a)">
        <div class="item-top">
          <n-tag v-if="a.important" size="small" type="warning" :bordered="false">重要</n-tag>
          <span v-if="!a.read" class="dot" title="未读" />
          <span class="title">{{ a.title }}</span>
          <button
            v-if="a.important && !a.confirmed"
            class="confirm-btn"
            @click.stop="confirm(a)"
          >确认收到</button>
          <span v-else-if="a.important && a.confirmed" class="confirmed">✓ 已确认</span>
        </div>
        <p class="meta">
          {{ a.author.nickname }} · {{ a.publishedAt?.slice(0, 16).replace('T', ' ') }}
          <span v-if="a.important && !a.confirmed" class="confirm-hint">（待确认收到）</span>
          <span v-if="a.important && a.confirmed" class="confirm-ok">✓ 已确认</span>
        </p>
      </div>
    </div>

    <empty-state v-else text="暂无公告" cta="发布第一条公告" @action="$router.push('/announcements/new')" />
  </section>
</template>

<style scoped>
.confirm-btn {
  background: transparent;
  border: 1px solid var(--cs-warning);
  color: var(--cs-warning);
  border-radius: 6px;
  padding: 2px 10px;
  font-size: 12px;
  cursor: pointer;
  flex-shrink: 0;
}
.confirm-btn:hover {
  background: rgba(210, 153, 34, 0.15);
}
.confirmed {
  color: var(--cs-success);
  font-size: 12px;
  flex-shrink: 0;
}
.new-link {
  color: var(--cs-accent);
  font-size: 13px;
  font-weight: 500;
}
.error {
  color: var(--cs-danger);
  font-size: 13px;
  margin-bottom: 12px;
}
.spin {
  display: block;
  margin: 48px auto;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.item {
  background: var(--cs-surface-1);
  border: 1px solid var(--cs-hairline);
  border-radius: 8px;
  padding: 14px 16px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.item:hover {
  background: var(--cs-surface-2);
  border-color: var(--cs-hairline-strong);
}
.item.unread {
  border-left: 2px solid var(--cs-accent);
}
.item-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.title {
  font-size: 15px;
  font-weight: 500;
  letter-spacing: -0.2px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.item.unread .title {
  color: var(--cs-ink);
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--cs-accent);
  flex-shrink: 0;
}
.meta {
  color: var(--cs-ink-subtle);
  font-size: 12px;
}
.confirm-hint {
  color: var(--cs-warning);
}
.confirm-ok {
  color: var(--cs-success);
}
</style>
