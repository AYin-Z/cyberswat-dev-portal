<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

interface TaskItem {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  dueAt: string | null
  assignee: { id: string; nickname: string } | null
  creator: { id: string; nickname: string }
  submitNote: string | null
}

const auth = useAuthStore()
const route = useRoute()
const project = ref<any>(null)
const error = ref('')

const statusLabel: Record<string, string> = { TODO: '待接单', IN_PROGRESS: '进行中', REVIEW: '待验收', DONE: '已完成' }
const priorityLabel: Record<string, string> = { LOW: '低', MEDIUM: '中', HIGH: '高', URGENT: '紧急' }

async function load() {
  const res = await fetch(`/api/projects/${route.params.id}`, { headers: { Authorization: `Bearer ${auth.token}` } })
  if (!res.ok) {
    error.value = `加载失败: ${res.status}`
    return
  }
  project.value = await res.json()
}

async function claim(t: TaskItem) {
  await fetch(`/api/tasks/${t.id}/claim`, { method: 'POST', headers: { Authorization: `Bearer ${auth.token}` } })
  await load()
}
async function submit(t: TaskItem) {
  const note = window.prompt('提交说明（PR 链接/实现简述）：') ?? ''
  await fetch(`/api/tasks/${t.id}/submit`, { method: 'POST', headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ note }) })
  await load()
}
async function review(t: TaskItem, approve: boolean) {
  await fetch(`/api/tasks/${t.id}/review`, { method: 'POST', headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ approve }) })
  await load()
}

onMounted(load)
</script>

<template>
  <section v-if="project">
    <h1 class="title">{{ project.name }}</h1>
    <p class="desc">{{ project.description }}</p>
    <div class="meta-line">
      <span>负责人：{{ project.lead.nickname }}</span>
      <span v-if="project.repoUrl">仓库：<a :href="project.repoUrl" target="_blank" class="repo">{{ project.repoUrl }}</a></span>
      <span v-if="project.difficulty">难度：{{ project.difficulty }}</span>
      <span>进度：{{ project.doneTaskCount }}/{{ project.taskCount }}</span>
    </div>

    <h2 class="sec">成员（{{ project.members?.length ?? 0 }}）</h2>
    <div class="members">
      <span v-for="m in project.members" :key="m.id" class="member">{{ m.nickname }}<em v-if="m.role === 'LEAD'"> 负责人</em></span>
    </div>

    <h2 class="sec">任务（{{ project.tasks?.length ?? 0 }}）</h2>
    <div class="tasks">
      <div v-for="t in project.tasks" :key="t.id" class="task">
        <div class="task-head">
          <span class="t-status" :class="t.status.toLowerCase()">{{ statusLabel[t.status] }}</span>
          <span class="t-pri" :class="t.priority.toLowerCase()">{{ priorityLabel[t.priority] }}</span>
          <span class="t-title">{{ t.title }}</span>
        </div>
        <p v-if="t.description" class="t-desc">{{ t.description }}</p>
        <p class="t-meta">
          指派：{{ t.assignee?.nickname ?? '未指派' }}
          <template v-if="t.dueAt">· 截止 {{ t.dueAt.slice(0, 10) }}</template>
          <template v-if="t.submitNote">· 提交：{{ t.submitNote }}</template>
        </p>
        <div class="t-actions">
          <button v-if="t.status === 'TODO'" class="act" @click="claim(t)">认领</button>
          <button v-if="t.status === 'IN_PROGRESS'" class="act" @click="submit(t)">提交验收</button>
          <template v-if="t.status === 'REVIEW' && auth.user?.id === t.creator.id">
            <button class="act ok" @click="review(t, true)">通过</button>
            <button class="act no" @click="review(t, false)">驳回</button>
          </template>
        </div>
      </div>
    </div>
    <p v-if="!project.tasks?.length" class="empty">暂无任务 — 在<a href="/tasks" class="link">任务页</a>创建</p>
  </section>
  <p v-else-if="error" class="error">{{ error }}</p>
</template>

<style scoped>
.title { font-size: 24px; margin-bottom: 8px; }
.desc { color: var(--muted); line-height: 1.7; margin-bottom: 12px; }
.meta-line { display: flex; gap: 20px; flex-wrap: wrap; color: var(--muted); font-size: 13px; margin-bottom: 24px; }
.repo { color: var(--accent); }
.sec { font-size: 16px; margin: 20px 0 12px; }
.members { display: flex; gap: 8px; flex-wrap: wrap; }
.member { background: var(--panel); border: 1px solid var(--border); border-radius: 999px; padding: 4px 14px; font-size: 13px; }
.member em { color: var(--accent); font-style: normal; font-size: 12px; }
.tasks { display: flex; flex-direction: column; gap: 10px; }
.task { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 14px 16px; }
.task-head { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.t-status { font-size: 11px; padding: 2px 8px; border-radius: 999px; }
.t-status.todo { color: var(--muted); border: 1px solid var(--muted); }
.t-status.in_progress { color: #58a6ff; border: 1px solid #58a6ff; }
.t-status.review { color: #d29922; border: 1px solid #d29922; }
.t-status.done { color: #3fb950; border: 1px solid #3fb950; }
.t-pri { font-size: 11px; }
.t-pri.high, .t-pri.urgent { color: #f85149; }
.t-pri.medium { color: #d29922; }
.t-title { font-weight: 600; font-size: 14px; }
.t-desc { color: var(--muted); font-size: 13px; margin-bottom: 6px; }
.t-meta { color: var(--muted); font-size: 12px; margin-bottom: 10px; }
.t-actions { display: flex; gap: 8px; }
.act { background: var(--accent); border: none; border-radius: 6px; padding: 6px 14px; color: #fff; cursor: pointer; font-size: 12px; }
.act.ok { background: #238636; }
.act.no { background: transparent; border: 1px solid #f85149; color: #f85149; }
.empty { color: var(--muted); font-size: 13px; }
.link { color: var(--accent); }
.error { color: #f85149; }
</style>
