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
  error.value = ''
  try {
    await auth.login(email.value, password.value)
    router.push('/')
  } catch {
    error.value = '邮箱或密码错误'
  } finally {
    busy.value = false
  }
}

function githubLogin() {
  window.location.href = '/api/auth/github/login'
}

onMounted(() => {
  // GitHub OAuth 回调：/login?token=xxx
  const token = route.query.token as string | undefined
  if (token) {
    auth.token = token
    auth.user = null
    localStorage.setItem('dev_token', token)
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
  <div class="auth-wrap">
    <div class="auth-card">
      <div class="brand">
        <span class="logo">⬡</span>
        <span class="name">CYBERSWAT<span class="dev">·DEV</span></span>
      </div>
      <h1 class="title">成员登录</h1>
      <p class="sub">网络特警队开发部协作工作台</p>

      <p v-if="error" class="error">{{ error }}</p>

      <form class="form" @submit.prevent="submit">
        <input v-model="email" type="email" placeholder="邮箱" autocomplete="email" required />
        <input v-model="password" type="password" placeholder="密码" autocomplete="current-password" required />
        <button type="submit" class="btn primary" :disabled="busy">
          {{ busy ? '登录中…' : '登录' }}
        </button>
      </form>

      <div class="divider"><span>或</span></div>

      <button type="button" class="btn ghost" @click="githubLogin">使用 GitHub 登录</button>

      <p class="hint">
        没有账号？需要部长发送<b>邀请链接</b>才能注册（邀请制）
        <RouterLink to="/register">注册</RouterLink>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.auth-card {
  width: 100%;
  max-width: 360px;
  background: var(--cs-surface-1);
  border: 1px solid var(--cs-hairline);
  border-radius: 10px;
  padding: 32px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
}
.logo {
  color: var(--cs-accent);
  font-size: 20px;
}
.name {
  font-weight: 700;
  letter-spacing: 1px;
  font-size: 14px;
}
.dev {
  color: var(--cs-accent);
}
.title {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.4px;
}
.sub {
  color: var(--cs-ink-subtle);
  font-size: 13px;
  margin: 4px 0 20px;
}
.error {
  color: var(--cs-danger);
  font-size: 13px;
  margin-bottom: 12px;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.form input {
  background: var(--cs-canvas);
  border: 1px solid var(--cs-hairline);
  border-radius: 8px;
  padding: 10px 12px;
  color: var(--cs-ink);
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.form input:focus {
  border-color: var(--cs-accent);
  box-shadow: 0 0 0 2px rgba(88, 166, 255, 0.4);
}
.btn {
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}
.btn.primary {
  background: var(--cs-accent);
  border: none;
  color: #fff;
}
.btn.primary:hover {
  background: var(--cs-accent-hover);
}
.btn.primary:disabled {
  opacity: 0.6;
}
.btn.ghost {
  background: transparent;
  border: 1px solid var(--cs-hairline);
  color: var(--cs-ink);
  width: 100%;
}
.btn.ghost:hover {
  background: var(--cs-surface-2);
}
.divider {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--cs-ink-tertiary);
  font-size: 12px;
  margin: 16px 0;
}
.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--cs-hairline);
}
.hint {
  color: var(--cs-ink-subtle);
  font-size: 12px;
  margin-top: 20px;
  text-align: center;
  line-height: 1.7;
}
.hint a {
  margin-left: 4px;
}
</style>
