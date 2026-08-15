<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const title = ref('')
const description = ref('')
const need = ref('')
const techStackText = ref('')
const error = ref('')
const submitting = ref(false)

async function submit() {
  submitting.value = true
  error.value = ''
  try {
    const techStack = techStackText.value
      .split(/[,，、\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    const res = await fetch('/api/ideas', {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.value, description: description.value, need: need.value, techStack }),
    })
    if (!res.ok) {
      const body = (await res.json()) as { message?: string }
      error.value = Array.isArray(body.message) ? body.message.join('; ') : (body.message ?? '发布失败')
      return
    }
    router.push('/ideas')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="wrap">
    <h1 class="title">发布点子</h1>
    <p class="sub">想清楚"缺什么"再发——这是招募成功的关键。</p>
    <p v-if="error" class="error">{{ error }}</p>
    <form class="form" @submit.prevent="submit">
      <input v-model="title" placeholder="点子标题（一句话说清做什么）" required />
      <textarea v-model="description" placeholder="详细描述：痛点 / 预想方案 / 目标用户" rows="5" required />
      <input v-model="need" placeholder="缺什么？如：缺 1 个会 Vue 的前端 + 1 个会 Node 的后端" required />
      <input v-model="techStackText" placeholder="技术栈（逗号分隔）：Vue, Node, PostgreSQL" />
      <button type="submit" :disabled="submitting">{{ submitting ? '发布中…' : '发布点子' }}</button>
    </form>
  </section>
</template>

<style scoped>
.wrap { max-width: 640px; }
.title { font-size: 22px; margin-bottom: 6px; }
.sub { color: var(--muted); font-size: 13px; margin-bottom: 16px; }
.form { display: flex; flex-direction: column; gap: 12px; }
input, textarea { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 10px; color: var(--fg); font-family: inherit; }
textarea { resize: vertical; }
button { background: var(--accent); border: none; border-radius: 6px; padding: 10px; color: #fff; cursor: pointer; font-weight: 600; }
button:disabled { opacity: 0.6; }
.error { color: #f85149; font-size: 13px; margin-bottom: 8px; }
</style>
