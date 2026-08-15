<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const board = ref('GENERAL')
const title = ref('')
const content = ref('')
const error = ref('')

async function submit() {
  const res = await fetch('/api/posts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ board: board.value, title: title.value, content: content.value }),
  })
  if (!res.ok) {
    const body = (await res.json()) as { message?: string }
    error.value = Array.isArray(body.message) ? body.message.join('; ') : (body.message ?? '发布失败')
    return
  }
  router.push('/posts')
}
</script>

<template>
  <section class="wrap">
    <h1 class="title">发帖</h1>
    <p v-if="error" class="error">{{ error }}</p>
    <form class="form" @submit.prevent="submit">
      <select v-model="board">
        <option value="GENERAL">灌水</option>
        <option value="HELP">求助</option>
        <option value="SHARE">分享</option>
        <option value="RECRUIT">招人</option>
      </select>
      <input v-model="title" placeholder="标题" required />
      <textarea v-model="content" placeholder="内容…（@昵称 可提及成员并通知）" rows="8" required />
      <button type="submit">发布</button>
    </form>
  </section>
</template>

<style scoped>
.wrap { max-width: 640px; }
.title { font-size: 22px; margin-bottom: 16px; }
.form { display: flex; flex-direction: column; gap: 12px; }
select, input, textarea { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 10px; color: var(--fg); font-family: inherit; }
textarea { resize: vertical; }
button { background: var(--accent); border: none; border-radius: 6px; padding: 10px; color: #fff; cursor: pointer; font-weight: 600; }
.error { color: #f85149; font-size: 13px; margin-bottom: 8px; }
</style>
