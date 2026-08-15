<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import PageHeader from '../../components/PageHeader.vue'
import { NInput, NButton, NSelect, NForm, NFormItem, useMessage } from 'naive-ui'

const auth = useAuthStore()
const router = useRouter()
const message = useMessage()

const board = ref('GENERAL')
const title = ref('')
const content = ref('')
const submitting = ref(false)

const boardOptions = [
  { label: '灌水', value: 'GENERAL' },
  { label: '求助', value: 'HELP' },
  { label: '分享', value: 'SHARE' },
  { label: '招人', value: 'RECRUIT' },
]

async function submit() {
  if (!title.value.trim() || !content.value.trim()) {
    message.warning('标题和内容不能为空')
    return
  }
  submitting.value = true
  try {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ board: board.value, title: title.value, content: content.value }),
    })
    if (!res.ok) {
      const body = (await res.json()) as { message?: string | string[] }
      message.error(Array.isArray(body.message) ? body.message[0] : (body.message ?? '发布失败'))
      return
    }
    message.success('帖子已发布')
    router.push('/posts')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="wrap">
    <page-header title="发帖" sub="@昵称 可提及成员并通知" />

    <n-form class="form" label-placement="top" @submit.prevent="submit">
      <n-form-item label="板块">
        <n-select v-model:value="board" :options="boardOptions" />
      </n-form-item>
      <n-form-item label="标题">
        <n-input v-model:value="title" placeholder="帖子标题" maxlength="100" />
      </n-form-item>
      <n-form-item label="内容">
        <n-input v-model:value="content" type="textarea" placeholder="内容…" :rows="8" />
      </n-form-item>
      <n-button type="primary" attr-type="submit" :loading="submitting" class="submit">
        发布
      </n-button>
    </n-form>
  </section>
</template>

<style scoped>
.wrap {
  max-width: 640px;
}
.form {
  background: var(--cs-surface-1);
  border: 1px solid var(--cs-hairline);
  border-radius: 8px;
  padding: 24px;
}
.submit {
  width: 100%;
}
</style>
