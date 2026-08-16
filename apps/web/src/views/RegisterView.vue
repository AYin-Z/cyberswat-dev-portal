<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { api, ApiError } from '../lib/api'

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
    // 🟡-8：走 setTokens 持久化双 token（注册用户同样获得 14 天续期能力）
    const data = await api<{ accessToken: string; refreshToken: string; user: { id: string; role: string; nickname: string } }>(
      '/api/auth/register',
      {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({
          email: email.value,
          password: password.value,
          nickname: nickname.value,
          inviteToken,
        }),
      },
    )
    auth.setTokens(data.accessToken, data.refreshToken)
    auth.user = data.user
    router.push('/')
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '注册失败'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="auth-wrap">
    <div class="auth-card">
      <div class="brand">
        <span class="logo">⬡</span>
        <span class="name">CYBERSWAT<span class="dev">·DEV</span></span>
      </div>
      <h1 class="title">加入开发部</h1>
      <p class="sub">凭邀请链接注册（邀请制）</p>

      <p v-if="!inviteToken" class="error">缺少邀请链接 —— 请联系部长获取</p>
      <p v-if="inviteToken" class="ok">已检测到邀请令牌 ✓</p>
      <p v-if="error" class="error">{{ error }}</p>

      <form class="form" @submit.prevent="submit">
        <input v-model="nickname" placeholder="昵称（对外展示）" aria-label="昵称" required :disabled="!inviteToken" />
        <input v-model="email" type="email" placeholder="邮箱" aria-label="邮箱" required :disabled="!inviteToken" />
        <input v-model="password" type="password" placeholder="密码（至少 8 位）" aria-label="密码" minlength="8" required :disabled="!inviteToken" />
        <button type="submit" class="btn primary" :disabled="!inviteToken || submitting">
          {{ submitting ? '注册中…' : '注册' }}
        </button>
      </form>

      <p class="hint">
        已有账号？<RouterLink to="/login">去登录</RouterLink>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-wrap {
  min-height: 100dvh; /* 🟡-7：100vh → 100dvh，避免移动端地址栏遮挡 */
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
  border-radius: 8px; /* 🟢：10px 不在 6/8/999 体系内 → 8px */
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
  font-size: 24px; /* 🟡-11：22px → 24px（pageTitle 档） */
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
.ok {
  color: var(--cs-success);
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
.form input:disabled {
  opacity: 0.5;
}
.btn {
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
.btn.primary {
  background: var(--cs-accent);
  border: none;
  color: var(--cs-canvas);
}
.btn.primary:hover {
  background: var(--cs-accent-hover);
}
.btn.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.hint {
  color: var(--cs-ink-subtle);
  font-size: 12px;
  margin-top: 20px;
  text-align: center;
}
</style>
