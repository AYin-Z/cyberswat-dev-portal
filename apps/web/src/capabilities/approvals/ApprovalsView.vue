<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '../../lib/api'
import PageHeader from '../../components/PageHeader.vue'
import EmptyState from '../../components/EmptyState.vue'
import { NDataTable, NButton, NTag, NSpin, useMessage } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { h } from 'vue'

interface PendingItem {
  id: string
  toolId: string
  caller: string
  agentId?: string
  params: Record<string, unknown>
  createdAt: string
}

const message = useMessage()
const items = ref<PendingItem[]>([])
const loading = ref(true)
const error = ref('') // 🟡-5：错误态独立渲染，不再冒充空态

async function load() {
  loading.value = true
  error.value = ''
  try {
    items.value = await api<PendingItem[]>('/api/tools/pending')
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

async function resolve(id: string, approve: boolean) {
  try {
    await api(`/api/tools/pending/${id}`, {
      method: 'POST',
      body: JSON.stringify({ approve }),
    })
    message.success(approve ? '已批准并执行' : '已驳回')
    await load()
  } catch (e) {
    message.error((e as Error).message)
  }
}

const columns: DataTableColumns<PendingItem> = [
  {
    title: '工具',
    key: 'toolId',
    width: 180,
    render: (r) => h('span', { class: 'mono' }, r.toolId),
  },
  {
    title: '来源',
    key: 'source',
    width: 130,
    render: (r) =>
      r.agentId
        ? h(NTag, { size: 'small', type: 'info', bordered: false }, { default: () => `🤖 agent` })
        : h(NTag, { size: 'small', bordered: false }, { default: () => '成员' }),
  },
  {
    title: '参数',
    key: 'params',
    ellipsis: { tooltip: true },
    render: (r) => h('span', { class: 'mono tnum' }, JSON.stringify(r.params)),
  },
  {
    title: '时间',
    key: 'createdAt',
    width: 150,
    render: (r) => h('span', { class: 'tnum' }, r.createdAt.slice(0, 16).replace('T', ' ')),
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    render: (r) =>
      h('div', { class: 'acts' }, [
        h(NButton, { size: 'tiny', type: 'success', onClick: () => resolve(r.id, true) }, { default: () => '批准' }),
        h(NButton, { size: 'tiny', type: 'error', quaternary: true, onClick: () => resolve(r.id, false) }, { default: () => '驳回' }),
      ]),
  },
]

onMounted(load)
</script>

<template>
  <section>
    <page-header title="审批工作台" sub="agent 的危险操作（发布/指派/邀请）在此人工确认后执行" />

    <n-spin v-if="loading" class="spin" />
    <!-- 🟡-5：加载失败渲染错误区块（带重试），不再显示「没有待审批的操作」误导 -->
    <div v-else-if="error" class="error-box">
      <p class="error-text">加载失败：{{ error }}</p>
      <n-button size="small" @click="load">重试</n-button>
    </div>
    <n-data-table
      v-else
      :columns="columns"
      :data="items"
      :bordered="false"
      size="small"
      class="table"
    />
    <empty-state v-if="!items.length && !loading && !error" text="没有待审批的操作" />
  </section>
</template>

<style scoped>
.spin {
  display: block;
  margin: 48px auto;
}
.error-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--cs-surface-1);
  border: 1px solid var(--cs-danger);
  border-radius: 8px;
}
.error-text {
  color: var(--cs-danger);
  font-size: 13px;
  flex: 1;
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
