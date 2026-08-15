<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../../lib/api'
import PageHeader from '../../components/PageHeader.vue'
import { NInput, NButton, NForm, NFormItem, useMessage } from 'naive-ui'

const router = useRouter()
const message = useMessage()

const title = ref('')
const description = ref('')
const need = ref('')
const techStackText = ref('')
const submitting = ref(false)

async function submit() {
  if (!title.value.trim() || !description.value.trim() || !need.value.trim()) {
    message.warning('标题/描述/缺什么 为必填')
    return
  }
  submitting.value = true
  try {
    const techStack = techStackText.value
      .split(/[,，、\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    await api('/api/ideas', {
      method: 'POST',
      body: JSON.stringify({ title: title.value, description: description.value, need: need.value, techStack }),
    })
    message.success('点子已发布')
    router.push('/ideas')
  } catch (e) {
    message.error((e as Error).message)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="wrap">
    <page-header title="发布点子" sub="想清楚「缺什么」再发——这是招募成功的关键" />

    <n-form class="form" label-placement="top" @submit.prevent="submit">
      <n-form-item label="点子标题">
        <n-input v-model:value="title" placeholder="一句话说清做什么" maxlength="80" />
      </n-form-item>
      <n-form-item label="详细描述">
        <n-input v-model:value="description" type="textarea" placeholder="痛点 / 预想方案 / 目标用户" :rows="5" />
      </n-form-item>
      <n-form-item label="缺什么？">
        <n-input v-model:value="need" placeholder="如：缺 1 个会 Vue 的前端 + 1 个会 Node 的后端" />
      </n-form-item>
      <n-form-item label="技术栈">
        <n-input v-model:value="techStackText" placeholder="逗号分隔：Vue, Node, PostgreSQL" />
      </n-form-item>
      <n-button type="primary" attr-type="submit" :loading="submitting" class="submit">
        发布点子
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
