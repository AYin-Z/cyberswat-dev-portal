<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthStore } from '../../stores/auth'

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
const items = ref<InviteItem[]>([])
const error = ref('')
const createdLink = ref('')
const creating = ref(false)

async function load() {
  const res = await fetch('/api/invites', {
    headers: { Authorization: `Bearer ${auth.token}` },
  })
  if (!res.ok) {
    error.value = `加载失败: ${res.status}`
    return
  }
  items.value = (await res.json()) as InviteItem[]
}

async function create(role: 'MEMBER' | 'DEPT_LEADER') {
  creating.value = true
  error.value = ''
  try {
    const res = await fetch('/api/invites', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role, expiresInDays: 7, maxUses: 1 }),
    })
    if (!res.ok) {
      const body = (await res.json()) as { message?: string }
      error.value = body.message ?? '创建失败'
      return
    }
    const data = (await res.json()) as { link: string }
    createdLink.value = data.link
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
  await load()
}

async function copyLink() {
  await navigator.clipboard.writeText(createdLink.value)
}

onMounted(load)
</script>

<template>
  <section>
    <h1 class="title">邀请管理</h1>
    <p class="sub">成员入口由邀请制控制：生成链接发给候选人，凭链接注册（角色随邀请指定）。</p>
    <p v-if="error" class="error">{{ error }}</p>

    <div class="actions">
      <button :disabled="creating" @click="create('MEMBER')">＋ 邀请普通成员</button>
      <button class="secondary" :disabled="creating" @click="create('DEPT_LEADER')">＋ 邀请干部</button>
    </div>

    <div v-if="createdLink" class="link-box">
      <p>邀请链接（仅显示一次）：</p>
      <code>{{ createdLink }}</code>
      <button class="small" @click="copyLink">复制</button>
    </div>

    <table class="tbl">
      <thead>
        <tr><th>角色</th><th>状态</th><th>名额</th><th>过期时间</th><th>创建时间</th><th></th></tr>
      </thead>
      <tbody>
        <tr v-for="i in items" :key="i.id">
          <td>{{ i.role }}</td>
          <td>
            <span v-if="i.revoked" class="badge revoked">已撤销</span>
            <span v-else-if="new Date(i.expiresAt) < new Date()" class="badge expired">已过期</span>
            <span v-else-if="i.usedCount >= i.maxUses" class="badge used">已用完</span>
            <span v-else class="badge active">有效</span>
          </td>
          <td>{{ i.usedCount }}/{{ i.maxUses }}</td>
          <td>{{ i.expiresAt.slice(0, 16).replace('T', ' ') }}</td>
          <td>{{ i.createdAt.slice(0, 16).replace('T', ' ') }}</td>
          <td>
            <button v-if="!i.revoked" class="small danger" @click="revoke(i.id)">撤销</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="!items.length && !error" class="empty">暂无邀请记录</p>
  </section>
</template>

<style scoped>
.title { font-size: 22px; margin-bottom: 8px; }
.sub { color: var(--muted); font-size: 13px; margin-bottom: 16px; }
.actions { display: flex; gap: 10px; margin-bottom: 16px; }
button { background: var(--accent); border: none; border-radius: 6px; padding: 8px 14px; color: #fff; cursor: pointer; font-size: 13px; }
button.secondary { background: #21262d; border: 1px solid var(--border); color: var(--fg); }
button.small { padding: 3px 10px; font-size: 12px; }
button.danger { background: transparent; border: 1px solid #f85149; color: #f85149; }
button:disabled { opacity: 0.5; }
.link-box { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; }
.link-box p { color: var(--muted); font-size: 12px; margin-bottom: 6px; }
.link-box code { color: var(--accent); font-size: 12px; word-break: break-all; display: block; margin-bottom: 8px; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th, .tbl td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--border); }
.tbl th { color: var(--muted); font-weight: 500; }
.badge { font-size: 11px; padding: 2px 8px; border-radius: 999px; }
.badge.active { color: #3fb950; border: 1px solid #3fb950; }
.badge.revoked, .badge.expired { color: #f85149; border: 1px solid #f85149; }
.badge.used { color: #d29922; border: 1px solid #d29922; }
.error { color: #f85149; font-size: 13px; margin-bottom: 10px; }
.empty { color: var(--muted); font-size: 13px; }
</style>
