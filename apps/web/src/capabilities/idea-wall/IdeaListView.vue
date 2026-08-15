<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '../../lib/api'
import PageHeader from '../../components/PageHeader.vue'
import StatusBadge from '../../components/StatusBadge.vue'
import EmptyState from '../../components/EmptyState.vue'
import { NTag, NSpin, NSelect } from 'naive-ui'

interface IdeaItem {
  id: string
  title: string
  description: string
  need: string
  techStack: string[]
  status: string
  author: { id: string; nickname: string }
  joinerCount: number
  joined: boolean
  createdAt: string
}

const items = ref<IdeaItem[]>([])
const error = ref('')
const loading = ref(true)
const statusFilter = ref<string | null>(null)

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '招募中', value: 'RECRUITING' },
  { label: '孵化中', value: 'INCUBATING' },
  { label: '已转正', value: 'PROMOTED' },
]

async function load() {
  loading.value = true
  const qs = statusFilter.value ? `?status=${statusFilter.value}` : ''
  try {
    items.value = await api<IdeaItem[]>(`/api/ideas${qs}`)
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
    <page-header title="点子墙" sub="有好点子但缺人力/技术力？发上来招募伙伴一起做">
      <template #actions>
        <RouterLink to="/ideas/new" class="new-link">＋ 发布点子</RouterLink>
      </template>
    </page-header>

    <div class="toolbar">
      <n-select
        v-model:value="statusFilter"
        :options="statusOptions"
        size="small"
        class="filter"
        @update:value="load"
      />
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <n-spin v-if="loading" class="spin" />

    <div v-else-if="items.length" class="grid">
      <RouterLink v-for="i in items" :key="i.id" :to="`/ideas/${i.id}`" class="card">
        <div class="card-top">
          <status-badge :status="i.status" type="idea" />
          <span class="joiners tnum">{{ i.joinerCount }} 人加入</span>
        </div>
        <h3 class="c-title">{{ i.title }}</h3>
        <p class="need">🔧 {{ i.need }}</p>
        <div class="tags">
          <n-tag v-for="t in i.techStack" :key="t" size="tiny" :bordered="false" class="tag">{{ t }}</n-tag>
        </div>
        <p class="meta">{{ i.author.nickname }} · {{ i.createdAt.slice(0, 10) }}</p>
      </RouterLink>
    </div>

    <empty-state v-else text="暂无点子" cta="来发第一个点子" @action="$router.push('/ideas/new')" />
  </section>
</template>

<style scoped>
.new-link {
  color: var(--cs-accent);
  font-size: 13px;
  font-weight: 500;
}
.toolbar {
  margin-bottom: 16px;
}
.filter {
  width: 160px;
}
.error {
  color: var(--cs-danger);
  font-size: 13px;
  margin-bottom: 10px;
}
.spin {
  display: block;
  margin: 48px auto;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
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
  align-items: center;
  margin-bottom: 10px;
}
.joiners {
  color: var(--cs-ink-subtle);
  font-size: 12px;
}
.c-title {
  font-size: 15px;
  font-weight: 500;
  letter-spacing: -0.2px;
  margin-bottom: 8px;
}
.need {
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
  margin-bottom: 10px;
}
.tag {
  background: rgba(88, 166, 255, 0.1);
  color: var(--cs-accent);
}
.meta {
  color: var(--cs-ink-subtle);
  font-size: 12px;
}
</style>
