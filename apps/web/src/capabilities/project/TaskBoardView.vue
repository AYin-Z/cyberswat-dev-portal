<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { api } from '../../lib/api'
import PageHeader from '../../components/PageHeader.vue'
import StatusBadge from '../../components/StatusBadge.vue'
import { NInput, NSelect, NButton, NDatePicker, NModal, NForm, NFormItem, NDropdown, useMessage } from 'naive-ui'
import type { DropdownOption } from 'naive-ui'
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
const loading = ref(true) // 🟡-5：看板补 loading 态

// 新任务弹窗
const showNew = ref(false)
const newTitle = ref('')
const newDesc = ref('')
const newAssignee = ref<string | null>(null)
const newProject = ref<string | null>(null)
const newPriority = ref('MEDIUM')
const newDue = ref<number | null>(null)
const creating = ref(false)

// 🟡-4：提交说明弹窗（替代原生 window.prompt，与深色语言一致、可校验）
const showSubmitNote = ref(false)
const submitNoteTask = ref<TaskItem | null>(null)
const submitNoteText = ref('')
const submittingNote = ref(false)

const priorityOptions = [
  { label: '低', value: 'LOW' },
  { label: '中', value: 'MEDIUM' },
  { label: '高', value: 'HIGH' },
  { label: '紧急', value: 'URGENT' },
]

// 🟡-6：computed 缓存列数组（稳定引用，vue-draggable 才能正常增删）
const colTasksMap = computed(() => {
  const map: Record<string, TaskItem[]> = {}
  for (const c of columns) {
    map[c.key] = tasks.value.filter((t) => t.status === c.key)
  }
  return map
})
const colTasks = (key: string) => colTasksMap.value[key] ?? []

// 🟡-6：看板键盘/无拖拽替代——卡片「下一步」操作菜单（复用 move 状态机）
const FLOW_LABEL: Record<string, string> = { TODO: '认领', IN_PROGRESS: '提交验收', REVIEW: '通过验收' }
function cardActions(task: TaskItem): DropdownOption[] {
  const next = FLOW_LABEL[task.status]
  if (!next) return []
  return [
    {
      label: next,
      key: 'next',
      onClick: () => move(task, task.status === 'TODO' ? 'IN_PROGRESS' : task.status === 'IN_PROGRESS' ? 'REVIEW' : 'DONE'),
    },
  ]
}

async function load() {
  loading.value = true
  try {
    const [t, m, p] = await Promise.all([
      api<TaskItem[]>('/api/tasks'),
      api<{ id: string; nickname: string }[]>('/api/members', { skipAuth: true }),
      api<{ id: string; name: string }[]>('/api/projects'),
    ])
    tasks.value = t
    members.value = m
    projects.value = p
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

async function move(task: TaskItem, toStatus: string) {
  if (task.status === toStatus) return
  // 🔴-3：按状态机映射动作（拖拽跳列时顺延流转）
  const flow: Record<string, string> = { TODO: 'IN_PROGRESS', IN_PROGRESS: 'REVIEW', REVIEW: 'DONE' }
  const action = flow[task.status] === toStatus
    ? task.status === 'TODO' ? 'claim'
      : task.status === 'IN_PROGRESS' ? 'submit'
      : 'review'
    : null
  if (!action) {
    message.warning('该状态跳转需走对应操作（认领/提交/验收）')
    return
  }
  // 🟡-6：统一走 api()，失败抛错 → error 提示，不再假成功
  try {
    if (action === 'review') {
      await api(`/api/tasks/${task.id}/review`, {
        method: 'POST',
        body: JSON.stringify({ approve: true }),
      })
      message.success('任务已更新')
      await load()
    } else if (action === 'submit') {
      // 🟡-4：提交说明走 n-modal（不再 window.prompt）
      submitNoteTask.value = task
      submitNoteText.value = ''
      showSubmitNote.value = true
    } else {
      await api(`/api/tasks/${task.id}/claim`, { method: 'POST' })
      message.success('任务已更新')
      await load()
    }
  } catch (e) {
    message.error((e as Error).message)
  }
}

async function confirmSubmitNote() {
  const task = submitNoteTask.value
  if (!task) return
  if (!submitNoteText.value.trim()) {
    message.warning('请填写提交说明（PR 链接/实现简述）')
    return
  }
  submittingNote.value = true
  try {
    await api(`/api/tasks/${task.id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ note: submitNoteText.value.trim() }),
    })
    message.success('任务已更新')
    showSubmitNote.value = false
    submitNoteTask.value = null
    await load()
  } catch (e) {
    message.error((e as Error).message)
  } finally {
    submittingNote.value = false
  }
}

async function createTask() {
  if (!newTitle.value.trim()) return
  creating.value = true
  try {
    await api('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({
        title: newTitle.value,
        description: newDesc.value || undefined,
        assigneeId: newAssignee.value ?? undefined,
        projectId: newProject.value ?? undefined,
        priority: newPriority.value,
        dueAt: newDue.value ? new Date(newDue.value).toISOString() : undefined,
      }),
    })
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

    <!-- 🟡-5：看板 loading 态（首载期间不再显示 0 计数的空列） -->
    <n-spin v-if="loading" class="spin" />

    <div v-else class="board">
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
          :animation="150"
          :data-col="col.key"
          @end="(e: any) => {
            // 🔴-3：end 事件只派发到源列——用 e.from/e.to 的 data-col 判定真实目标列
            const fromCol = e.from?.dataset?.col
            const toCol = e.to?.dataset?.col
            const target = toCol || fromCol
            const id = e.item?.dataset?.id
            const t = tasks.find((x) => x.id === id)
            if (t && target && t.status !== target) move(t, target)
          }"
        >
          <template #default>
            <div
              v-for="el in colTasks(col.key)"
              :key="el.id"
              class="card"
              :data-id="el.id"
              :class="`pri-${el.priority.toLowerCase()}`"
            >
              <div class="card-top">
                <status-badge :status="el.priority" type="priority" />
                <span v-if="el.projectName" class="proj">{{ el.projectName }}</span>
                <n-dropdown v-if="cardActions(el).length" :options="cardActions(el)" trigger="click">
                  <button class="card-more" aria-label="任务操作" title="操作">⋯</button>
                </n-dropdown>
              </div>
              <p class="t-title">{{ el.title }}</p>
              <p class="t-meta">
                指派：{{ el.assignee?.nickname ?? '未指派' }}
                <template v-if="el.dueAt">· {{ el.dueAt.slice(0, 10) }}</template>
              </p>
              <p v-if="el.submitNote" class="t-note">📎 {{ el.submitNote }}</p>
            </div>
          </template>
        </draggable>
      </div>
    </div>

    <!-- 新任务弹窗 -->
    <n-modal v-model:show="showNew" preset="card" title="创建任务" style="width: 480px; max-width: calc(100vw - 32px)">
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

    <!-- 🟡-4：提交说明弹窗（替代原生 window.prompt） -->
    <n-modal v-model:show="showSubmitNote" preset="card" title="提交验收" style="width: 480px; max-width: calc(100vw - 32px)">
      <n-form label-placement="top">
        <n-form-item label="提交说明">
          <n-input
            v-model:value="submitNoteText"
            type="textarea"
            :rows="3"
            placeholder="PR 链接 / 实现简述"
            maxlength="500"
            show-count
          />
        </n-form-item>
        <n-button type="primary" block :loading="submittingNote" @click="confirmSubmitNote">提交</n-button>
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
  font-size: 12px; /* 🟡-11：11px → 12px */
}
.t-title {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 4px;
}
.t-meta {
  color: var(--cs-ink-subtle);
  font-size: 12px; /* 🟡-11：11px → 12px（meta 档） */
}
.t-note {
  color: var(--cs-accent);
  font-size: 12px; /* 🟡-11：11px → 12px */
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* 🟡-6：卡片「操作」按钮（键盘替代入口） */
.card-more {
  background: none;
  border: none;
  color: var(--cs-ink-subtle);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  padding: 0 4px;
  border-radius: 4px;
}
.card-more:hover {
  color: var(--cs-ink);
  background: var(--cs-surface-3);
}

/* 🟡-1：窄屏兜底——看板改横向滚动，每列最小 260px */
@media (max-width: 900px) {
  .board {
    grid-template-columns: none;
    display: flex;
    overflow-x: auto;
    padding-bottom: 8px;
    scroll-snap-type: x proximity;
  }
  .col {
    flex: 0 0 260px;
    scroll-snap-align: start;
  }
}
</style>
