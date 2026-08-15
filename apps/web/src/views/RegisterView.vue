<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const email = ref('')
const password = ref('')
const nickname = ref('')
const error = ref('')
const submitting = ref(false)

const inviteToken = (route.query.invite as string) ?? ''

async function submit() {
  submitting.value = true
  error.value = ''
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.value,
        password: password.value,
        nickname: nickname.value,
        inviteToken,
      }),
    })
    if (!res.ok) {
      const body = (await res.json()) as { message?: string }
      error.value = body.message ?? '注册失败'
      return
    }
    const data = (await res.json()) as { accessToken: string; user: { id: string; role: string; nickname: string } }
    auth.token = data.accessToken
    auth.user = data.user
    localStorage.setItem('dev_token', data.accessToken)
    router.push('/')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="wrap">
    <form class="card" @submit.prevent="submit">
      <h2>加入 CyberSWAT 开发部</h2>
      <p v-if="!inviteToken" class="error">缺少邀请链接 —— 请联系部长获取邀请链接</p>
      <p v-if="inviteToken" class="hint">已检测到邀请令牌 ✅</p>
      <p v-if="error" class="error">{{ error }}</p>
      <input v-model="nickname" placeholder="昵称（对外展示）" required :disabled="!inviteToken" />
      <input v-model="email" type="email" placeholder="邮箱" required :disabled="!inviteToken" />
      <input v-model="password" type="password" placeholder="密码（至少 8 位）" required minlength="8" :disabled="!inviteToken" />
      <button type="submit" :disabled="!inviteToken || submitting">{{ submitting ? '注册中…' : '注册' }}</button>
      <RouterLink to="/login" class="link">已有账号？去登录</RouterLink>
    </form>
  </section>
</template>

<style scoped>
.wrap { display: flex; justify-content: center; padding-top: 8vh; }
.card { display: flex; flex-direction: column; gap: 12px; width: 340px; background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 24px; }
.card h2 { font-size: 18px; }
input { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 10px; color: var(--fg); }
input:disabled { opacity: 0.5; }
button { background: var(--accent); border: none; border-radius: 6px; padding: 10px; color: #fff; cursor: pointer; font-weight: 600; }
button:disabled { opacity: 0.4; cursor: not-allowed; }
.error { color: #f85149; font-size: 13px; }
.hint { color: #3fb950; font-size: 13px; }
.link { color: var(--muted); font-size: 13px; text-align: center; text-decoration: none; }
</style>
