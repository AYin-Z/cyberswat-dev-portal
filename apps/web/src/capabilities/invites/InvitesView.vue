<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthStore } from '../../stores/auth'
import PageHeader from '../../components/PageHeader.vue'
import EmptyState from '../../components/EmptyState.vue'
import { NButton, NTag, NSpin, NDataTable, useMessage } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'

interface InviteItem {
  id: string
  role: string
  expiresAt: string
  maxUses: number
  usedCount: number
  createdBy: string
  revoked: boolean
  createdAt: string
}

const auth = useAuthStore()
const message = useMessage()
const items = ref<InviteItem[]>([])
const error = ref('')
const loading = ref(true)
const createdLink = ref('')
const creating = ref(false)

async function load() {
  loading.value = true
  const res = await fetch('/api/invites', { headers: { Authorization: `Bearer ${auth.token}` } })
  if (!res.ok) {
    error.value = `加载失败: ${res.status}`
    loading.value = false
    return
  }
  items.value = (await res.json()) as InviteItem[]
  loading.value = false
}

async function create(role: 'MEMBER' | 'DEPT_LEADER') {
  creating.value = true
  try {
    const res = await fetch('/api/invites', {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, expiresInDays: 7, maxUses: 1 }),
    })
    if (!res.ok) {
      const body = (await res.json()) as { message?: string }
      message.error(body.message ?? '创建失败')
      return
    }
    const data = (await res.json()) as { link: string }
    createdLink.value = data.link
    message.success('邀请已创建')
    await load()
  } finally {
    creating.value = false
  }
}

async function revoke(id: string) {
  await fetch(`/api/invites/${id}/revoke`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth.token}` },
  })
  message.success('已撤销')
  await load()
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(createdLink.value)
    message.success('链接已复制')
  } catch {
    message.info(createdLink.value)
  }
}

const columns: DataTableColumns<InviteItem> = [
  {
    title: '角色',
    key: 'role',
    width: 100,
    render: (r) =>
      h(NTag, { size: 'small', bordered: false, type: r.role === 'DEPT_LEADER' ? 'warning' : 'default' }, { default: () => (r.role === 'DEPT_LEADER' ? '干部' : '成员') }),
  },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render: (r) => {
      const state = r.revoked ? { label: '已撤销', color: 'error' as const }
        : new Date(r.expiresAt) < new Date() ? { label: '已过期', color: 'error' as const }
        : r.usedCount >= r.maxUses ? { label: '已用完', color: 'warning' as const }
        : { label: '有效', color: 'success' as const }
      return h(NTag, { size: 'small', bordered: false, type: state.color }, { default: () => state.label })
    },
  },
  {
    title: '名额',
    key: 'uses',
    width: 80,
    render: (r) => h('span', { class: 'tnum' }, `${r.usedCount}/${r.maxUses}`),
  },
  {
    title: '过期时间',
    key: 'expires',
    width: 150,
    render: (r) => h('span', { class: 'tnum' }, r.expiresAt.slice(0, 16).replace('T', ' ')),
  },
  {
    title: '创建时间',
    key: 'created',
    width: 150,
    render: (r) => h('span', { class: 'tnum' }, r.createdAt.slice(0, 16).replace('T', ' ')),
  },
  {
    title: '操作',
    key: 'actions',
    width: 80,
    render: (r) =>
      r.revoked
        ? h('span', { class: 'muted' }, '—')
        : h(
            NButton,
            { size: 'tiny', type: 'error', quaternary: true, onClick: () => revoke(r.id) },
            { default: () => '撤销' },
          ),
  },
]

import { h } from 'vue'

onMounted(load)
</script>

<template>
  <section>
    <page-header title="邀请管理" sub="成员入口由邀请制控制 — 生成链接发给候选人，凭链接注册">
      <template #actions>
        <n-button size="small" :loading="creating" @click="create('MEMBER')">＋ 邀请成员</n-button>
        <n-button size="small" type="warning" secondary :loading="creating" @click="create('DEPT_LEADER')">＋ 邀请干部</n-button>
      </template>
    </page-header>

    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="createdLink" class="link-box">
      <p class="link-label">邀请链接（仅显示一次）：</p>
      <code class="link-code">{{ createdLink }}</code>
      <n-button size="tiny" @click="copyLink">复制</n-button>
    </div>

    <n-spin v-if="loading" class="spin" />
    <n-data-table
      v-else
      :columns="columns"
      :data="items"
      :bordered="false"
      size="small"
      class="table"
    />
    <empty-state v-if="!items.length && !loading" text="暂无邀请记录" />
  </section>
</template>

<style scoped>
.error {
  color: var(--cs-danger);
  font-size: 13px;
  margin-bottom: 12px;
}
.link-box {
  background: var(--cs-surface-1);
  border: 1px solid var(--cs-hairline);
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.link-label {
  color: var(--cs-ink-subtle);
  font-size: 12px;
  flex-shrink: 0;
}
.link-code {
  color: var(--cs-accent);
  font-size: 12px;
  word-break: break-all;
  flex: 1;
  font-family: 'JetBrains Mono', monospace;
}
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
.muted {
  color: var(--cs-ink-tertiary);
  font-size: 12px;
}
</style>
