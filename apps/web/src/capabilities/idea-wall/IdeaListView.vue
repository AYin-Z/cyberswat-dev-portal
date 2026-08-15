<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthStore } from '../../stores/auth'

interface IdeaItem {
  id: string
  title: string
  description: string
  need: string
  techStack: string[]
  status: string
  author: { id: string; nickname: string; grade: string | null }
  joinerCount: number
  joined: boolean
  createdAt: string
}

const auth = useAuthStore()
const items = ref<IdeaItem[]>([])
const error = ref('')
const statusFilter = ref('')

const statusLabel: Record<string, string> = {
  RECRUITING: '招募中',
  INCUBATING: '孵化中',
  PROMOTED: '已转正',
  ARCHIVED: '已废弃',
}

async function load() {
  const qs = statusFilter.value ? `?status=${statusFilter.value}` : ''
  const res = await fetch(`/api/ideas${qs}`, {
    headers: { Authorization: `Bearer ${auth.token}` },
  })
  if (!res.ok) {
    error.value = `加载失败: ${res.status}`
    return
  }
  items.value = (await res.json()) as IdeaItem[]
}

onMounted(load)
</script>

<template>
  <section>
    <div class="head">
      <h1 class="title">点子墙</h1>
      <RouterLink to="/ideas/new" class="new-btn">＋ 发布点子</RouterLink>
    </div>
    <p class="sub">有好点子但缺人力/技术力？发上来招募伙伴一起做。</p>
    <p v-if="error" class="error">{{ error }}</p>
    <div class="filters">
      <select v-model="statusFilter" @change="load">
        <option value="">全部状态</option>
        <option value="RECRUITING">招募中</option>
        <option value="INCUBATING">孵化中</option>
        <option value="PROMOTED">已转正</option>
      </select>
    </div>
    <div class="grid">
      <RouterLink v-for="i in items" :key="i.id" :to="`/ideas/${i.id}`" class="card">
        <div class="card-head">
          <span class="status" :class="i.status.toLowerCase()">{{ statusLabel[i.status] }}</span>
          <span class="joiners">{{ i.joinerCount }} 人加入</span>
        </div>
        <h3>{{ i.title }}</h3>
        <p class="need">🔧 {{ i.need }}</p>
        <div class="tags">
          <span v-for="t in i.techStack" :key="t" class="tag">{{ t }}</span>
        </div>
        <p class="meta">{{ i.author.nickname }} · {{ i.createdAt.slice(0, 10) }}</p>
      </RouterLink>
    </div>
    <p v-if="!items.length && !error" class="empty">暂无点子，来发第一个？</p>
  </section>
</template>

<style scoped>
.head { display: flex; justify-content: space-between; align-items: center; }
.title { font-size: 22px; margin-bottom: 4px; }
.sub { color: var(--muted); font-size: 13px; margin-bottom: 16px; }
.new-btn { color: var(--accent); text-decoration: none; font-size: 14px; }
.filters { margin-bottom: 16px; }
select { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 6px 10px; color: var(--fg); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.card { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 16px; text-decoration: none; color: var(--fg); }
.card:hover { border-color: var(--accent); }
.card-head { display: flex; justify-content: space-between; margin-bottom: 10px; }
.status { font-size: 11px; padding: 2px 8px; border-radius: 999px; }
.status.recruiting { color: #3fb950; border: 1px solid #3fb950; }
.status.incubating { color: #58a6ff; border: 1px solid #58a6ff; }
.status.promoted { color: #d29922; border: 1px solid #d29922; }
.status.archived { color: var(--muted); border: 1px solid var(--muted); }
.joiners { color: var(--muted); font-size: 12px; }
.card h3 { font-size: 15px; margin-bottom: 8px; }
.need { color: var(--muted); font-size: 13px; margin-bottom: 10px; line-height: 1.6; }
.tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
.tag { font-size: 11px; color: var(--accent); background: rgba(88, 166, 255, 0.1); padding: 2px 8px; border-radius: 999px; }
.meta { color: var(--muted); font-size: 12px; }
.error { color: #f85149; font-size: 13px; margin-bottom: 10px; }
.empty { color: var(--muted); font-size: 14px; }
</style>
