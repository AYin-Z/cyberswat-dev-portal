<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthStore } from '../../stores/auth'

interface ProjectItem {
  id: string
  name: string
  description: string
  difficulty: string | null
  techStack: string[]
  status: string
  needPeople: string | null
  lead: { id: string; nickname: string }
  ideaId: string | null
  repoUrl: string | null
  memberCount: number
  taskCount: number
  doneTaskCount: number
  createdAt: string
}

const auth = useAuthStore()
const projects = ref<ProjectItem[]>([])
const error = ref('')

const statusLabel: Record<string, string> = {
  ACTIVE: '进行中',
  PAUSED: '暂停',
  DONE: '已完成',
  ARCHIVED: '已归档',
}

async function load() {
  const res = await fetch('/api/projects', { headers: { Authorization: `Bearer ${auth.token}` } })
  if (!res.ok) {
    error.value = `加载失败: ${res.status}`
    return
  }
  projects.value = (await res.json()) as ProjectItem[]
}

onMounted(load)
</script>

<template>
  <section>
    <h1 class="title">项目</h1>
    <p class="sub">点子转正后的正式项目 — 人力/任务/成果都在这里。</p>
    <p v-if="error" class="error">{{ error }}</p>
    <div class="grid">
      <RouterLink v-for="p in projects" :key="p.id" :to="`/projects/${p.id}`" class="card">
        <div class="card-head">
          <span class="status" :class="p.status.toLowerCase()">{{ statusLabel[p.status] }}</span>
          <span v-if="p.difficulty" class="diff">{{ p.difficulty }}</span>
        </div>
        <h3>{{ p.name }}</h3>
        <p class="desc">{{ p.description }}</p>
        <div class="tags">
          <span v-for="t in p.techStack.slice(0, 4)" :key="t" class="tag">{{ t }}</span>
        </div>
        <div class="stats">
          <span>👥 {{ p.memberCount }}</span>
          <span>📋 {{ p.doneTaskCount }}/{{ p.taskCount }}</span>
        </div>
        <p class="meta">负责人：{{ p.lead.nickname }} · {{ p.createdAt.slice(0, 10) }}</p>
      </RouterLink>
    </div>
    <p v-if="!projects.length && !error" class="empty">
      暂无项目 — 去<a href="/ideas" class="link">点子墙</a>把好点子转正
    </p>
  </section>
</template>

<style scoped>
.title { font-size: 22px; margin-bottom: 6px; }
.sub { color: var(--muted); font-size: 13px; margin-bottom: 20px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
.card { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 16px; text-decoration: none; color: var(--fg); }
.card:hover { border-color: var(--accent); }
.card-head { display: flex; justify-content: space-between; margin-bottom: 10px; }
.status { font-size: 11px; padding: 2px 8px; border-radius: 999px; }
.status.active { color: #3fb950; border: 1px solid #3fb950; }
.status.paused { color: #d29922; border: 1px solid #d29922; }
.status.done { color: #58a6ff; border: 1px solid #58a6ff; }
.status.archived { color: var(--muted); border: 1px solid var(--muted); }
.diff { color: var(--muted); font-size: 12px; }
.card h3 { font-size: 16px; margin-bottom: 8px; }
.desc { color: var(--muted); font-size: 13px; line-height: 1.6; margin-bottom: 10px; min-height: 42px; }
.tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
.tag { font-size: 11px; color: var(--accent); background: rgba(88, 166, 255, 0.1); padding: 2px 8px; border-radius: 999px; }
.stats { display: flex; gap: 16px; color: var(--muted); font-size: 13px; margin-bottom: 8px; }
.meta { color: var(--muted); font-size: 12px; }
.error { color: #f85149; font-size: 13px; margin-bottom: 10px; }
.empty { color: var(--muted); font-size: 14px; }
.link { color: var(--accent); }
</style>
