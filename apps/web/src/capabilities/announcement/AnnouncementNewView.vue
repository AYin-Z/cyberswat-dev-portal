<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const title = ref('')
const content = ref('')
const important = ref(false)
const error = ref('')
const submitting = ref(false)

async function submit() {
  submitting.value = true
  error.value = ''
  try {
    const res = await fetch('/api/announcements', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: title.value, content: content.value, important: important.value }),
    })
    if (!res.ok) {
      const body = (await res.json()) as { message?: string }
      error.value = body.message ?? '发布失败'
      return
    }
    router.push('/announcements')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="wrap">
    <h1 class="title">发布公告</h1>
    <p v-if="error" class="error">{{ error }}</p>
    <form class="form" @submit.prevent="submit">
      <input v-model="title" placeholder="标题" required />
      <textarea v-model="content" placeholder="正文内容" rows="6" required />
      <label class="check">
        <input v-model="important" type="checkbox" />
        重要公告（成员需确认收到）
      </label>
      <button type="submit" :disabled="submitting">{{ submitting ? '发布中…' : '发布' }}</button>
    </form>
  </section>
</template>

<style scoped>
.wrap { max-width: 640px; }
.title { font-size: 22px; margin-bottom: 16px; }
.form { display: flex; flex-direction: column; gap: 12px; }
input, textarea { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 10px; color: var(--fg); font-family: inherit; }
textarea { resize: vertical; }
.check { color: var(--muted); font-size: 13px; display: flex; align-items: center; gap: 6px; }
button { background: var(--accent); border: none; border-radius: 6px; padding: 10px; color: #fff; cursor: pointer; font-weight: 600; }
button:disabled { opacity: 0.6; }
.error { color: #f85149; font-size: 13px; margin-bottom: 8px; }
</style>
