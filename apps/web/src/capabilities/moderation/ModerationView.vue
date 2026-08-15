<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthStore } from '../../stores/auth'
import PageHeader from '../../components/PageHeader.vue'
import EmptyState from '../../components/EmptyState.vue'
import { NDataTable, NButton, NTag, NSpin, useMessage } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { h } from 'vue'

interface ReportItem {
  id: string
  targetType: string
  targetId: string
  reason: string
  reporterId: string
  status: string
  createdAt: string
}

const auth = useAuthStore()
const message = useMessage()
const reports = ref<ReportItem[]>([])
const loading = ref(true)

const typeLabel: Record<string, string> = {
  post: '帖子',
  comment: '评论',
  idea: '点子',
  announcement: '公告',
}

async function load() {
  loading.value = true
  const res = await fetch('/api/moderation/reports', {
    headers: { Authorization: `Bearer ${auth.token}` },
  })
  if (res.ok) {
    reports.value = (await res.json()) as ReportItem[]
  }
  loading.value = false
}

async function resolve(id: string, action: 'RESOLVED' | 'DISMISSED') {
  await fetch(`/api/moderation/reports/${id}?action=${action}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth.token}` },
  })
  message.success(action === 'RESOLVED' ? '已删除违规内容' : '已忽略')
  await load()
}

const columns: DataTableColumns<ReportItem> = [
  {
    title: '类型',
    key: 'targetType',
    width: 70,
    render: (r) => h(NTag, { size: 'small', bordered: false }, { default: () => typeLabel[r.targetType] ?? r.targetType }),
  },
  {
    title: '目标',
    key: 'targetId',
    width: 120,
    render: (r) => h('span', { class: 'mono tnum' }, r.targetId.slice(0, 8)),
  },
  { title: '举报原因', key: 'reason', ellipsis: { tooltip: true } },
  {
    title: '时间',
    key: 'createdAt',
    width: 150,
    render: (r) => h('span', { class: 'tnum' }, r.createdAt.slice(0, 16).replace('T', ' ')),
  },
  {
    title: '操作',
    key: 'actions',
    width: 140,
    render: (r) =>
      h('div', { class: 'acts' }, [
        h(NButton, { size: 'tiny', type: 'error', onClick: () => resolve(r.id, 'RESOLVED') }, { default: () => '删除内容' }),
        h(NButton, { size: 'tiny', quaternary: true, onClick: () => resolve(r.id, 'DISMISSED') }, { default: () => '忽略' }),
      ]),
  },
]

onMounted(load)
</script>

<template>
  <section>
    <page-header title="内容处置" sub="举报队列 — 删除违规内容或忽略" />

    <n-spin v-if="loading" class="spin" />
    <n-data-table
      v-else
      :columns="columns"
      :data="reports"
      :bordered="false"
      size="small"
      class="table"
    />
    <empty-state v-if="!reports.length && !loading" text="暂无待处置举报" />
  </section>
</template>

<style scoped>
.spin {
  display: block;
  margin: 48px auto;
}
.table {
  background: var(--cs-surface-1);
  border: 1px solid var(--cs-hairline);
  border-radius: 8px;
  overflow: hidden;
}
.acts {
  display: flex;
  gap: 6px;
}
</style>
