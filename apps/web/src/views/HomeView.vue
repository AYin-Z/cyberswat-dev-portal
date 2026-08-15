<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { api } from '../lib/api'
import PageHeader from '../components/PageHeader.vue'
import StatusBadge from '../components/StatusBadge.vue'
import EmptyState from '../components/EmptyState.vue'

const auth = useAuthStore()

interface TaskItem {
  id: string
  title: string
  status: string
  priority: string
  projectName: string | null
}
interface IdeaItem {
  id: string
  title: string
  status: string
  techStack: string[]
  need: string
}
interface NoticeItem {
  id: string
  title: string
  type: string
  read: boolean
  createdAt: string
}
interface AnnItem {
  id: string
  title: string
  important: boolean
  read: boolean
}

const tasks = ref<TaskItem[]>([])
const ideas = ref<IdeaItem[]>([])
const notices = ref<NoticeItem[]>([])
const anns = ref<AnnItem[]>([])
const loading = ref(true)

const kpi = computed(() => ({
  todo: tasks.value.filter((t) => t.status === 'TODO').length,
  progress: tasks.value.filter((t) => t.status === 'IN_PROGRESS').length,
  review: tasks.value.filter((t) => t.status === 'REVIEW').length,
  unread: notices.value.filter((n) => !n.read).length,
}))

async function load() {
  if (!auth.isLoggedIn) {
    loading.value = false
    return
  }
  try {
    // 🟡-7：我的任务 = 指派给我或我创建的（按 assigneeId 过滤）
    // 🔴-4/🟡-4：统一走 api()（自动带 token / 401 续期 / 非 2xx 抛错，不再裸解析 JSON）
    const [t, i, n, a] = await Promise.all([
      api<TaskItem[]>(`/api/tasks?assigneeId=${auth.user?.id ?? ''}`),
      api<IdeaItem[]>('/api/ideas'),
      api<NoticeItem[]>('/api/notifications'),
      api<AnnItem[]>('/api/announcements'),
    ])
    tasks.value = (t ?? []).slice(0, 6)
    ideas.value = (i ?? []).filter((x: IdeaItem) => x.status === 'RECRUITING').slice(0, 4)
    notices.value = (n ?? []).slice(0, 5)
    anns.value = (a ?? []).slice(0, 4)
  } catch (e) {
    console.error('工作台加载失败', e)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <section v-if="auth.isLoggedIn">
    <page-header title="工作台" sub="CyberSWAT 开发部 · dev.cyberswat.cn">
      <template #actions>
        <RouterLink to="/ideas/new" class="quick">＋ 发点子</RouterLink>
        <RouterLink to="/tasks" class="quick">新任务</RouterLink>
        <RouterLink to="/posts/new" class="quick">发帖</RouterLink>
      </template>
    </page-header>

    <!-- KPI 行 -->
    <div class="kpi-row">
      <div class="kpi">
        <span class="num tnum">{{ kpi.todo }}</span>
        <span class="label">待接单</span>
      </div>
      <div class="kpi">
        <span class="num tnum">{{ kpi.progress }}</span>
        <span class="label">进行中</span>
      </div>
      <div class="kpi">
        <span class="num tnum">{{ kpi.review }}</span>
        <span class="label">待验收</span>
      </div>
      <div class="kpi">
        <span class="num tnum accent">{{ kpi.unread }}</span>
        <span class="label">未读通知</span>
      </div>
    </div>

    <div class="cols">
      <!-- 左 2/3 -->
      <div class="main-col">
        <section class="panel">
          <h2 class="panel-title">我的任务</h2>
          <div v-if="tasks.length" class="list">
            <RouterLink v-for="t in tasks" :key="t.id" :to="'/tasks'" class="row">
              <status-badge :status="t.status" type="task" />
              <span class="t-title">{{ t.title }}</span>
              <span v-if="t.projectName" class="t-proj">{{ t.projectName }}</span>
            </RouterLink>
          </div>
          <empty-state v-else text="暂无任务" cta="去创建第一个任务" @action="$router.push('/tasks')" />
        </section>

        <section class="panel">
          <h2 class="panel-title">招募中的点子</h2>
          <div v-if="ideas.length" class="list">
            <RouterLink v-for="i in ideas" :key="i.id" :to="`/ideas/${i.id}`" class="row">
              <status-badge :status="i.status" type="idea" />
              <span class="t-title">{{ i.title }}</span>
              <span class="t-need">🔧 {{ i.need }}</span>
            </RouterLink>
          </div>
          <empty-state v-else text="暂无招募中的点子" cta="发布第一个点子" @action="$router.push('/ideas/new')" />
        </section>
      </div>

      <!-- 右 1/3 -->
      <div class="side-col">
        <section class="panel">
          <h2 class="panel-title">通知</h2>
          <div v-if="notices.length" class="list">
            <div v-for="n in notices" :key="n.id" class="row nrow" :class="{ unread: !n.read }">
              <span class="n-type">{{ n.type }}</span>
              <span class="t-title">{{ n.title }}</span>
            </div>
          </div>
          <empty-state v-else text="暂无通知" />
        </section>

        <section class="panel">
          <h2 class="panel-title">最近公告</h2>
          <div v-if="anns.length" class="list">
            <RouterLink v-for="a in anns" :key="a.id" :to="'/announcements'" class="row">
              <span v-if="a.important" class="imp">重要</span>
              <span class="t-title" :class="{ unread: !a.read }">{{ a.title }}</span>
            </RouterLink>
          </div>
          <empty-state v-else text="暂无公告" />
        </section>
      </div>
    </div>
  </section>

  <!-- 未登录：品牌入口 -->
  <section v-else class="hero">
    <div class="hero-inner">
      <span class="hero-logo">⬡</span>
      <h1 class="hero-title">CYBERSWAT<span class="dev">·DEV</span></h1>
      <p class="hero-sub">网络特警队开发部 · 协作工作台</p>
      <div class="hero-actions">
        <RouterLink to="/login" class="hero-btn primary">成员登录</RouterLink>
        <RouterLink to="/register" class="hero-btn ghost">邀请注册</RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.quick {
  color: var(--cs-accent);
  font-size: 13px;
  margin-left: 12px;
}
.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
.kpi {
  background: var(--cs-surface-1);
  border: 1px solid var(--cs-hairline);
  border-radius: 8px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.num {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.4px;
}
.num.accent {
  color: var(--cs-accent);
}
.label {
  color: var(--cs-ink-subtle);
  font-size: 12px;
}
.cols {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
  align-items: start;
}
.main-col,
.side-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.panel {
  background: var(--cs-surface-1);
  border: 1px solid var(--cs-hairline);
  border-radius: 8px;
  padding: 16px;
}
.panel-title {
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.3px;
  color: var(--cs-ink-muted);
  margin-bottom: 12px;
}
.list {
  display: flex;
  flex-direction: column;
}
.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 4px;
  border-bottom: 1px solid var(--cs-hairline-subtle);
  color: var(--cs-ink);
  font-size: 13px;
}
.row:last-child {
  border-bottom: none;
}
.row:hover {
  background: var(--cs-surface-2);
}
.t-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.t-proj,
.t-need {
  color: var(--cs-ink-subtle);
  font-size: 12px;
  max-width: 40%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.nrow {
  cursor: default;
}
.nrow.unread .t-title {
  color: var(--cs-ink);
  font-weight: 500;
}
.n-type {
  font-size: 11px;
  color: var(--cs-accent);
  border: 1px solid var(--cs-hairline);
  border-radius: 4px;
  padding: 0 6px;
  flex-shrink: 0;
}
.imp {
  font-size: 11px;
  color: var(--cs-warning);
  border: 1px solid var(--cs-warning);
  border-radius: 4px;
  padding: 0 6px;
  flex-shrink: 0;
}
.unread {
  color: var(--cs-ink);
}

/* 未登录 hero */
.hero {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 70vh;
}
.hero-inner {
  text-align: center;
}
.hero-logo {
  font-size: 48px;
  color: var(--cs-accent);
}
.hero-title {
  font-size: 40px;
  font-weight: 600;
  letter-spacing: -1px;
  margin: 12px 0 8px;
}
.dev {
  color: var(--cs-accent);
}
.hero-sub {
  color: var(--cs-ink-subtle);
  font-size: 14px;
  margin-bottom: 28px;
}
.hero-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}
.hero-btn {
  padding: 9px 22px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
}
.hero-btn.primary {
  background: var(--cs-accent);
  color: #fff;
}
.hero-btn.primary:hover {
  background: var(--cs-accent-hover);
  color: #fff;
}
.hero-btn.ghost {
  border: 1px solid var(--cs-hairline);
  color: var(--cs-ink-muted);
}
.hero-btn.ghost:hover {
  background: var(--cs-surface-2);
}
</style>
