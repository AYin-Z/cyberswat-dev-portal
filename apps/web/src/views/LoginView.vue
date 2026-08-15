<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRoute, useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const email = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

async function submit() {
  busy.value = true
  try {
    await auth.login(email.value, password.value)
    router.push('/')
  } catch (e) {
    error.value = e instanceof Error ? e.message : '登录失败'
  } finally {
    busy.value = false
  }
}

function githubLogin() {
  // 跳转后端 OAuth 授权（后端配置 GITHUB_CLIENT_ID 后生效）
  window.location.href = '/api/auth/github/login'
}

onMounted(() => {
  // GitHub OAuth 回调：后端回跳 /login?token=xxx
  const token = route.query.token as string | undefined
  if (token) {
    auth.token = token
    auth.user = null
    localStorage.setItem('dev_token', token)
    // 用 token 拉取用户信息
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((u) => {
        auth.user = u
        router.replace('/')
      })
      .catch(() => {
        error.value = 'GitHub 登录成功但获取用户信息失败'
      })
  }
})
</script>

<template>
  <section class="login">
    <form class="card" @submit.prevent="submit">
      <h2>成员登录</h2>
      <p v-if="error" class="error">{{ error }}</p>
      <input v-model="email" type="email" placeholder="邮箱" required />
      <input v-model="password" type="password" placeholder="密码" required />
      <button type="submit" :disabled="busy">{{ busy ? '登录中…' : '登录' }}</button>
      <div class="divider"><span>或</span></div>
      <button type="button" class="github" @click="githubLogin">使用 GitHub 登录</button>
      <p class="hint">没有账号？需要部长发送<b>邀请链接</b>才能注册（邀请制）</p>
    </form>
  </section>
</template>

<style scoped>
.login { display: flex; justify-content: center; padding-top: 8vh; }
.card { display: flex; flex-direction: column; gap: 12px; width: 320px; background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 24px; }
.card h2 { font-size: 18px; }
input { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 10px; color: var(--fg); }
button { background: var(--accent); border: none; border-radius: 6px; padding: 10px; color: #fff; cursor: pointer; font-weight: 600; }
button:disabled { opacity: 0.6; }
.github { background: #21262d; border: 1px solid var(--border); color: var(--fg); }
.divider { display: flex; align-items: center; gap: 10px; color: var(--muted); font-size: 12px; }
.divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
.error { color: #f85149; font-size: 13px; }
.hint { color: var(--muted); font-size: 12px; }
</style>
