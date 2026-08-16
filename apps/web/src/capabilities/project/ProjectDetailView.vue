<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { api } from '../../lib/api'
import StatusBadge from '../../components/StatusBadge.vue'
import { NTag, NSpin, NButton, NProgress, NModal, NInput, NForm, NFormItem, useMessage } from 'naive-ui'

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
const message = useMessage()
const project = ref<any>(null)
const error = ref('')
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    project.value = await api(`/api/projects/${route.params.id}`)
  } catch (e) {
    error.value = `加载失败: ${(e as Error).message}`
  } finally {
    loading.value = false
  }
}

// 🟡-6：写操作统一走 api()，失败抛错 → error 提示，不再假成功
async function claim(t: TaskItem) {
  try {
    await api(`/api/tasks/${t.id}/claim`, { method: 'POST' })
    message.success('已认领')
    await load()
  } catch (e) {
    message.error((e as Error).message)
  }
}
// 🟡-4：提交说明弹窗（替代原生 window.prompt）
const showSubmitNote = ref(false)
const submitNoteTask = ref<TaskItem | null>(null)
const submitNoteText = ref('')
const submittingNote = ref(false)

function openSubmitNote(t: TaskItem) {
  submitNoteTask.value = t
  submitNoteText.value = ''
  showSubmitNote.value = true
}

async function confirmSubmitNote() {
  const t = submitNoteTask.value
  if (!t) return
  if (!submitNoteText.value.trim()) {
    message.warning('请填写提交说明（PR 链接/实现简述）')
    return
  }
  submittingNote.value = true
  try {
    await api(`/api/tasks/${t.id}/submit`, { method: 'POST', body: JSON.stringify({ note: submitNoteText.value.trim() }) })
    message.success('已提交验收')
    showSubmitNote.value = false
    submitNoteTask.value = null
    await load()
  } catch (e) {
    message.error((e as Error).message)
  } finally {
    submittingNote.value = false
  }
}

async function review(t: TaskItem, approve: boolean) {
  try {
    await api(`/api/tasks/${t.id}/review`, { method: 'POST', body: JSON.stringify({ approve }) })
    message.success(approve ? '已通过' : '已驳回')
    await load()
  } catch (e) {
    message.error((e as Error).message)
  }
}

onMounted(load)
</script>

<template>
  <section>
    <n-spin v-if="loading" class="spin" />
    <p v-else-if="error" class="error">{{ error }}</p>

    <template v-else-if="project">
      <div class="head">
        <h1 class="title">{{ project.name }}</h1>
        <status-badge :status="project.status" type="project" />
      </div>
      <p class="desc">{{ project.description }}</p>

      <div class="meta-row">
        <span>负责人：<b>{{ project.lead.nickname }}</b></span>
        <span v-if="project.repoUrl">仓库：<a :href="project.repoUrl" target="_blank" class="repo">{{ project.repoUrl }}</a></span>
        <span v-if="project.difficulty">难度：{{ project.difficulty }}</span>
      </div>

      <div class="progress-row">
        <span class="p-label tnum">进度 {{ project.doneTaskCount }}/{{ project.taskCount }}</span>
        <n-progress
          type="line"
          :percentage="project.taskCount ? Math.round((project.doneTaskCount / project.taskCount) * 100) : 0"
          :height="4"
          :show-indicator="false"
          class="progress"
        />
      </div>

      <h2 class="sec">成员（{{ project.members?.length ?? 0 }}）</h2>
      <div class="members">
        <span v-for="m in project.members" :key="m.id" class="member">
          {{ m.nickname }}<em v-if="m.role === 'LEAD'"> 负责人</em>
        </span>
      </div>

      <h2 class="sec">任务（{{ project.tasks?.length ?? 0 }}）</h2>
      <div class="tasks">
        <div v-for="t in project.tasks" :key="t.id" class="task">
          <div class="task-head">
            <status-badge :status="t.status" type="task" />
            <status-badge :status="t.priority" type="priority" />
            <span class="t-title">{{ t.title }}</span>
          </div>
          <p v-if="t.description" class="t-desc">{{ t.description }}</p>
          <p class="t-meta">
            指派：{{ t.assignee?.nickname ?? '未指派' }}
            <template v-if="t.dueAt">· 截止 {{ t.dueAt.slice(0, 10) }}</template>
            <template v-if="t.submitNote">· 📎 {{ t.submitNote }}</template>
          </p>
          <div class="t-actions">
            <n-button v-if="t.status === 'TODO'" size="tiny" type="primary" quaternary @click="claim(t)">认领</n-button>
            <n-button v-if="t.status === 'IN_PROGRESS'" size="tiny" type="primary" quaternary @click="openSubmitNote(t)">提交验收</n-button>
            <template v-if="t.status === 'REVIEW' && auth.user?.id === t.creator.id">
              <n-button size="tiny" type="success" quaternary @click="review(t, true)">通过</n-button>
              <n-button size="tiny" type="error" quaternary @click="review(t, false)">驳回</n-button>
            </template>
          </div>
        </div>
      </div>
    </template>

    <!-- 🟡-4：提交说明弹窗 -->
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
.spin {
  display: block;
  margin: 48px auto;
}
.error {
  color: var(--cs-danger);
}
.head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.title {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.4px;
}
.desc {
  color: var(--cs-ink-muted);
  line-height: 1.7;
  margin-bottom: 12px;
}
.meta-row {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  color: var(--cs-ink-subtle);
  font-size: 13px;
  margin-bottom: 16px;
}
.repo {
  color: var(--cs-accent);
}
.progress-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}
.p-label {
  color: var(--cs-ink-subtle);
  font-size: 12px;
  flex-shrink: 0;
}
.progress {
  flex: 1;
}
.sec {
  font-size: 15px; /* 🟡-11：16px → 15px（cardTitle 档） */
  font-weight: 600;
  margin: 20px 0 12px;
}
.members {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.member {
  background: var(--cs-surface-1);
  border: 1px solid var(--cs-hairline);
  border-radius: 999px;
  padding: 4px 14px;
  font-size: 13px;
}
.member em {
  color: var(--cs-accent);
  font-style: normal;
  font-size: 12px;
}
.tasks {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.task {
  background: var(--cs-surface-1);
  border: 1px solid var(--cs-hairline);
  border-radius: 8px;
  padding: 14px 16px;
}
.task-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.t-title {
  font-weight: 500;
  font-size: 14px;
}
.t-desc {
  color: var(--cs-ink-muted);
  font-size: 13px;
  margin-bottom: 6px;
}
.t-meta {
  color: var(--cs-ink-subtle);
  font-size: 12px;
  margin-bottom: 10px;
}
.t-actions {
  display: flex;
  gap: 8px;
}
</style>
