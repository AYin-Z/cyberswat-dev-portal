<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthStore } from '../../stores/auth'
import PageHeader from '../../components/PageHeader.vue'
import StatusBadge from '../../components/StatusBadge.vue'
import { NInput, NSelect, NButton, NDatePicker, NModal, NForm, NFormItem, useMessage } from 'naive-ui'
import { VueDraggableNext as draggable } from 'vue-draggable-next'

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
const message = useMessage()

const columns = [
  { key: 'TODO', label: '待接单' },
  { key: 'IN_PROGRESS', label: '进行中' },
  { key: 'REVIEW', label: '待验收' },
  { key: 'DONE', label: '已完成' },
]

const tasks = ref<TaskItem[]>([])
const members = ref<{ id: string; nickname: string }[]>([])
const projects = ref<{ id: string; name: string }[]>([])
const error = ref('')

// 新任务弹窗
const showNew = ref(false)
const newTitle = ref('')
const newDesc = ref('')
const newAssignee = ref<string | null>(null)
const newProject = ref<string | null>(null)
const newPriority = ref('MEDIUM')
const newDue = ref<number | null>(null)
const creating = ref(false)

const priorityOptions = [
  { label: '低', value: 'LOW' },
  { label: '中', value: 'MEDIUM' },
  { label: '高', value: 'HIGH' },
  { label: '紧急', value: 'URGENT' },
]

const colTasks = (key: string) => tasks.value.filter((t) => t.status === key)

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

async function move(task: TaskItem, toStatus: string) {
  if (task.status === toStatus) return
  // 通过状态流转 API 移动（接单/提交/验收语义由后端校验）
  const action = task.status === 'TODO' && toStatus === 'IN_PROGRESS' ? 'claim'
    : task.status === 'IN_PROGRESS' && toStatus === 'REVIEW' ? 'submit'
    : task.status === 'REVIEW' && toStatus === 'DONE' ? 'review'
    : null
  if (!action) {
    message.warning('该状态跳转需走对应操作（认领/提交/验收）')
    return
  }
  if (action === 'review') {
    const res = await fetch(`/api/tasks/${task.id}/review`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ approve: true }),
    })
    if (!res.ok) return message.error('验收失败（仅创建者可验收）')
  } else if (action === 'submit') {
    const note = window.prompt('提交说明（PR 链接/实现简述）：') ?? ''
    await fetch(`/api/tasks/${task.id}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    })
  } else {
    await fetch(`/api/tasks/${task.id}/claim`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.token}` },
    })
  }
  message.success('任务已更新')
  await load()
}

async function createTask() {
  if (!newTitle.value.trim()) return
  creating.value = true
  try {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle.value,
        description: newDesc.value || undefined,
        assigneeId: newAssignee.value ?? undefined,
        projectId: newProject.value ?? undefined,
        priority: newPriority.value,
        dueAt: newDue.value ? new Date(newDue.value).toISOString() : undefined,
      }),
    })
    if (!res.ok) {
      message.error('创建失败（需要部长权限）')
      return
    }
    message.success('任务已创建')
    showNew.value = false
    newTitle.value = newDesc.value = ''
    await load()
  } finally {
    creating.value = false
  }
}

onMounted(load)
</script>

<template>
  <section>
    <page-header title="任务" sub="指派 → 接单 → 提交 → 验收，拖拽卡片流转状态">
      <template #actions>
        <n-button type="primary" size="small" @click="showNew = true">＋ 新任务</n-button>
      </template>
    </page-header>

    <p v-if="error" class="error">{{ error }}</p>

    <div class="board">
      <div v-for="col in columns" :key="col.key" class="col">
        <div class="col-head">
          <span class="col-label">{{ col.label }}</span>
          <span class="col-count tnum">{{ colTasks(col.key).length }}</span>
        </div>
        <draggable
          :list="colTasks(col.key)"
          :group="{ name: 'tasks' }"
          item-key="id"
          class="col-body"
          @end="(e: any) => {
            const id = e.item?.dataset?.id
            const t = tasks.find((x) => x.id === id)
            if (t) move(t, col.key)
          }"
        >
          <template #item="{ element }">
            <div class="card" :data-id="element.id" :class="`pri-${element.priority.toLowerCase()}`">
              <div class="card-top">
                <status-badge :status="element.priority" type="priority" />
                <span v-if="element.projectName" class="proj">{{ element.projectName }}</span>
              </div>
              <p class="t-title">{{ element.title }}</p>
              <p class="t-meta">
                指派：{{ element.assignee?.nickname ?? '未指派' }}
                <template v-if="element.dueAt">· {{ element.dueAt.slice(0, 10) }}</template>
              </p>
              <p v-if="element.submitNote" class="t-note">📎 {{ element.submitNote }}</p>
            </div>
          </template>
        </draggable>
      </div>
    </div>

    <!-- 新任务弹窗 -->
    <n-modal v-model:show="showNew" preset="card" title="创建任务" style="width: 480px">
      <n-form label-placement="top">
        <n-form-item label="标题">
          <n-input v-model:value="newTitle" placeholder="任务标题" />
        </n-form-item>
        <n-form-item label="描述">
          <n-input v-model:value="newDesc" type="textarea" :rows="2" placeholder="可选" />
        </n-form-item>
        <n-form-item label="指派给">
          <n-select v-model:value="newAssignee" :options="members.map((m) => ({ label: m.nickname, value: m.id }))" placeholder="选择成员" clearable />
        </n-form-item>
        <n-form-item label="所属项目">
          <n-select v-model:value="newProject" :options="projects.map((p) => ({ label: p.name, value: p.id }))" placeholder="选择项目" clearable />
        </n-form-item>
        <n-form-item label="优先级">
          <n-select v-model:value="newPriority" :options="priorityOptions" />
        </n-form-item>
        <n-form-item label="截止日期">
          <n-date-picker v-model:value="newDue" type="date" clearable style="width: 100%" />
        </n-form-item>
        <n-button type="primary" block :loading="creating" @click="createTask">创建</n-button>
      </n-form>
    </n-modal>
  </section>
</template>

<style scoped>
.error {
  color: var(--cs-danger);
  font-size: 13px;
  margin-bottom: 12px;
}
.board {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  align-items: start;
}
.col {
  background: var(--cs-surface-1);
  border: 1px solid var(--cs-hairline);
  border-radius: 8px;
  min-height: 300px;
}
.col-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--cs-hairline);
}
.col-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--cs-ink-muted);
}
.col-count {
  font-size: 12px;
  color: var(--cs-ink-subtle);
  background: var(--cs-surface-3);
  border-radius: 999px;
  padding: 0 8px;
}
.col-body {
  padding: 10px;
  min-height: 260px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.card {
  background: var(--cs-surface-2);
  border: 1px solid var(--cs-hairline);
  border-left: 2px solid var(--cs-ink-subtle);
  border-radius: 6px;
  padding: 10px 12px;
  cursor: grab;
  transition: border-color 0.15s;
}
.card:hover {
  border-color: var(--cs-hairline-strong);
}
.card.pri-high,
.card.pri-urgent {
  border-left-color: var(--cs-danger);
}
.card.pri-medium {
  border-left-color: var(--cs-warning);
}
.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.proj {
  color: var(--cs-ink-subtle);
  font-size: 11px;
}
.t-title {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 4px;
}
.t-meta {
  color: var(--cs-ink-subtle);
  font-size: 11px;
}
.t-note {
  color: var(--cs-accent);
  font-size: 11px;
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
