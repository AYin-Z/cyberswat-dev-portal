<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()
const email = ref('')
const password = ref('')
const error = ref('')

async function submit() {
  try {
    await auth.login(email.value, password.value)
    router.push('/')
  } catch (e) {
    error.value = e instanceof Error ? e.message : '登录失败'
  }
}
</script>

<template>
  <section class="login">
    <form class="card" @submit.prevent="submit">
      <h2>成员登录</h2>
      <p v-if="error" class="error">{{ error }}</p>
      <input v-model="email" type="email" placeholder="邮箱" required />
      <input v-model="password" type="password" placeholder="密码" required />
      <button type="submit">登录</button>
      <p class="hint">开发期可用 curl 注册测试账号（/api/auth/register）</p>
    </form>
  </section>
</template>

<style scoped>
.login { display: flex; justify-content: center; padding-top: 8vh; }
.card { display: flex; flex-direction: column; gap: 12px; width: 320px; background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 24px; }
.card h2 { font-size: 18px; }
input { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 10px; color: var(--fg); }
button { background: var(--accent); border: none; border-radius: 6px; padding: 10px; color: #fff; cursor: pointer; font-weight: 600; }
.error { color: #f85149; font-size: 13px; }
.hint { color: var(--muted); font-size: 12px; }
</style>
