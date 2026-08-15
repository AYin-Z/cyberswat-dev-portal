<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../../lib/api'
import PageHeader from '../../components/PageHeader.vue'
import { NInput, NButton, NSwitch, NForm, NFormItem, useMessage } from 'naive-ui'

const router = useRouter()
const message = useMessage()

const title = ref('')
const content = ref('')
const important = ref(false)
const submitting = ref(false)

async function submit() {
  if (!title.value.trim() || !content.value.trim()) {
    message.warning('标题和正文不能为空')
    return
  }
  submitting.value = true
  try {
    await api('/api/announcements', {
      method: 'POST',
      body: JSON.stringify({
        title: title.value,
        content: content.value,
        important: important.value,
      }),
    })
    message.success('公告已发布')
    router.push('/announcements')
  } catch (e) {
    message.error((e as Error).message)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="wrap">
    <page-header title="发布公告" sub="重要公告将要求成员确认收到" />

    <n-form class="form" label-placement="top" @submit.prevent="submit">
      <n-form-item label="标题">
        <n-input v-model:value="title" placeholder="公告标题" maxlength="100" />
      </n-form-item>
      <n-form-item label="正文">
        <n-input v-model:value="content" type="textarea" placeholder="公告内容" :rows="8" />
      </n-form-item>
      <n-form-item label=" ">
        <div class="imp-row">
          <n-switch v-model:value="important" />
          <span class="imp-label">重要公告（成员需确认收到）</span>
        </div>
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
.imp-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.imp-label {
  color: var(--cs-ink-subtle);
  font-size: 13px;
}
.submit {
  width: 100%;
}
</style>
