<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthStore } from '../../stores/auth'

interface TaskItem {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  dueAt: string | null
  projectId: string | null
  projectName: string | null
  assignee: { id: string; nickname: string } | null
  creator: { id: string; nickname: string }
  submitNote: string | null
}

const auth = useAuthStore()
const tasks = ref<TaskItem[]>([])
const members = ref<{ id: string; nickname: string }[]>([])
const projects = ref<{ id: string; name: string }[]>([])
const error = ref('')
const showNew = ref(false)
const title = ref('')
const desc = ref('')
const assigneeId = ref('')
const projectId = ref('')
const priority = ref('MEDIUM')
const dueAt = ref('')

const statusLabel: Record<string, string> = { TODO: '待接单', IN_PROGRESS: '进行中', REVIEW: '待验收', DONE: '已完成' }
const priorityLabel: Record<string, string> = { LOW: '低', MEDIUM: '中', HIGH: '高', URGENT: '紧急' }

async function load() {
  const [tRes, mRes, pRes] = await Promise.all([
    fetch('/api/tasks', { headers: { Authorization: `Bearer ${auth.token}` } }),
    fetch('/api/members'),
    fetch('/api/projects', { headers: { Authorization: `Bearer ${auth.token}` } }),
  ])
  tasks.value = (await tRes.json()) as TaskItem[]
  members.value = (await mRes.json()) as { id: string; nickname: string }[]
  projects.value = (await pRes.json()) as { id: string; name: string }[]
}

async function createTask() {
  await fetch('/api/tasks', {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: title.value,
      description: desc.value,
      assigneeId: assigneeId.value || undefined,
      projectId: projectId.value || undefined,
      priority,
      dueAt: dueAt.value ? new Date(dueAt.value).toISOString() : undefined,
    }),
  })
  showNew.value = false
  title.value = desc.value = ''
  await load()
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
  <section>
    <div class="head">
      <h1 class="title">任务</h1>
      <button class="new" @click="showNew = !showNew">{{ showNew ? '取消' : '＋ 新任务' }}</button>
    </div>
    <p class="sub">指派 → 接单 → 提交 → 验收，任务闭环在这里完成。</p>
    <p v-if="error" class="error">{{ error }}</p>

    <form v-if="showNew" class="new-form" @submit.prevent="createTask">
      <input v-model="title" placeholder="任务标题" required />
      <input v-model="desc" placeholder="任务描述" />
      <div class="row">
        <select v-model="assigneeId">
          <option value="">指派给…</option>
          <option v-for="m in members" :key="m.id" :value="m.id">{{ m.nickname }}</option>
        </select>
        <select v-model="projectId">
          <option value="">所属项目</option>
          <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
        <select v-model="priority">
          <option value="LOW">低优先级</option>
          <option value="MEDIUM">中优先级</option>
          <option value="HIGH">高优先级</option>
          <option value="URGENT">紧急</option>
        </select>
        <input v-model="dueAt" type="date" />
      </div>
      <button type="submit" class="new">创建</button>
    </form>

    <div class="board">
      <div v-for="(col, key) in statusLabel" :key="key" class="col">
        <h3 class="col-title">{{ col }}</h3>
        <div v-for="t in tasks.filter((x) => x.status === key)" :key="t.id" class="card">
          <div class="card-top">
            <span class="pri" :class="t.priority.toLowerCase()">{{ priorityLabel[t.priority] }}</span>
            <span v-if="t.projectName" class="proj">{{ t.projectName }}</span>
          </div>
          <p class="t-title">{{ t.title }}</p>
          <p class="t-meta">
            指派：{{ t.assignee?.nickname ?? '未指派' }}
            <template v-if="t.dueAt">· {{ t.dueAt.slice(0, 10) }}</template>
          </p>
          <p v-if="t.submitNote" class="t-note">📎 {{ t.submitNote }}</p>
          <div class="actions">
            <button v-if="t.status === 'TODO'" @click="claim(t)">认领</button>
            <button v-if="t.status === 'IN_PROGRESS'" @click="submit(t)">提交</button>
            <template v-if="t.status === 'REVIEW' && auth.user?.id === t.creator.id">
              <button class="ok" @click="review(t, true)">通过</button>
              <button class="no" @click="review(t, false)">驳回</button>
            </template>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.head { display: flex; justify-content: space-between; align-items: center; }
.title { font-size: 22px; margin-bottom: 4px; }
.sub { color: var(--muted); font-size: 13px; margin-bottom: 16px; }
.new { background: var(--accent); border: none; border-radius: 6px; padding: 8px 14px; color: #fff; cursor: pointer; font-size: 13px; }
.new-form { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 14px; margin-bottom: 16px; display: flex; flex-direction: column; gap: 10px; }
.new-form input, .new-form select { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 8px; color: var(--fg); }
.row { display: flex; gap: 8px; }
.row select, .row input { flex: 1; }
.board { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.col { background: rgba(22, 27, 34, 0.6); border: 1px solid var(--border); border-radius: 8px; padding: 12px; min-height: 200px; }
.col-title { font-size: 13px; color: var(--muted); margin-bottom: 10px; letter-spacing: 1px; }
.card { background: var(--panel); border: 1px solid var(--border); border-radius: 6px; padding: 10px 12px; margin-bottom: 10px; }
.card-top { display: flex; gap: 6px; margin-bottom: 6px; }
.pri { font-size: 10px; padding: 1px 6px; border-radius: 999px; }
.pri.high, .pri.urgent { color: #f85149; border: 1px solid #f85149; }
.pri.medium { color: #d29922; border: 1px solid #d29922; }
.pri.low { color: var(--muted); border: 1px solid var(--muted); }
.proj { color: var(--muted); font-size: 11px; }
.t-title { font-size: 13px; font-weight: 600; margin-bottom: 4px; }
.t-meta { color: var(--muted); font-size: 11px; margin-bottom: 6px; }
.t-note { color: var(--accent); font-size: 11px; margin-bottom: 6px; }
.actions { display: flex; gap: 6px; }
.actions button { background: var(--accent); border: none; border-radius: 4px; padding: 4px 10px; color: #fff; cursor: pointer; font-size: 11px; }
.actions .ok { background: #238636; }
.actions .no { background: transparent; border: 1px solid #f85149; color: #f85149; }
.error { color: #f85149; font-size: 13px; }
</style>
