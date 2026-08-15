<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '../../lib/api'
import PageHeader from '../../components/PageHeader.vue'
import StatusBadge from '../../components/StatusBadge.vue'
import EmptyState from '../../components/EmptyState.vue'
import { NTag, NSpin, NProgress } from 'naive-ui'

interface ProjectItem {
  id: string
  name: string
  description: string
  difficulty: string | null
  techStack: string[]
  status: string
  lead: { id: string; nickname: string }
  ideaId: string | null
  repoUrl: string | null
  memberCount: number
  taskCount: number
  doneTaskCount: number
  createdAt: string
}

const projects = ref<ProjectItem[]>([])
const error = ref('')
const loading = ref(true)

async function load() {
  try {
    projects.value = await api<ProjectItem[]>('/api/projects')
  } catch (e) {
    error.value = `加载失败: ${(e as Error).message}`
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <section>
    <page-header title="项目" sub="点子转正后的正式项目 — 人力 / 任务 / 成果" />

    <p v-if="error" class="error">{{ error }}</p>
    <n-spin v-if="loading" class="spin" />

    <div v-else-if="projects.length" class="grid">
      <RouterLink v-for="p in projects" :key="p.id" :to="`/projects/${p.id}`" class="card">
        <div class="card-top">
          <status-badge :status="p.status" type="project" />
          <span v-if="p.difficulty" class="diff">{{ p.difficulty }}</span>
        </div>
        <h3 class="c-title">{{ p.name }}</h3>
        <p class="desc">{{ p.description }}</p>
        <div class="tags">
          <n-tag v-for="t in p.techStack.slice(0, 4)" :key="t" size="tiny" :bordered="false" class="tag">{{ t }}</n-tag>
        </div>
        <div class="progress-row">
          <span class="p-label tnum">{{ p.doneTaskCount }}/{{ p.taskCount }}</span>
          <n-progress
            type="line"
            :percentage="p.taskCount ? Math.round((p.doneTaskCount / p.taskCount) * 100) : 0"
            :height="4"
            :show-indicator="false"
            class="progress"
          />
          <span class="p-members tnum">{{ p.memberCount }} 人</span>
        </div>
        <p class="meta">负责人：{{ p.lead.nickname }} · {{ p.createdAt.slice(0, 10) }}</p>
      </RouterLink>
    </div>

    <empty-state v-else text="暂无项目 — 去点子墙把好点子转正" cta="去点子墙" @action="$router.push('/ideas')" />
  </section>
</template>

<style scoped>
.error {
  color: var(--cs-danger);
  font-size: 13px;
  margin-bottom: 12px;
}
.spin {
  display: block;
  margin: 48px auto;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}
.card {
  background: var(--cs-surface-1);
  border: 1px solid var(--cs-hairline);
  border-radius: 8px;
  padding: 16px;
  text-decoration: none;
  color: var(--cs-ink);
  transition: background 0.15s, border-color 0.15s;
}
.card:hover {
  background: var(--cs-surface-2);
  border-color: var(--cs-hairline-strong);
}
.card-top {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}
.diff {
  color: var(--cs-ink-subtle);
  font-size: 12px;
}
.c-title {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.3px;
  margin-bottom: 8px;
}
.desc {
  color: var(--cs-ink-muted);
  font-size: 13px;
  line-height: 1.6;
  margin-bottom: 10px;
  min-height: 40px;
}
.tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.tag {
  background: rgba(88, 166, 255, 0.1);
  color: var(--cs-accent);
}
.progress-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.p-label {
  color: var(--cs-ink-subtle);
  font-size: 12px;
  flex-shrink: 0;
}
.progress {
  flex: 1;
}
.p-members {
  color: var(--cs-ink-subtle);
  font-size: 12px;
  flex-shrink: 0;
}
.meta {
  color: var(--cs-ink-subtle);
  font-size: 12px;
}
</style>
