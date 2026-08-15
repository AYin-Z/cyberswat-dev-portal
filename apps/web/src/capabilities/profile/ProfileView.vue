<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { api } from '../../lib/api'
import PageHeader from '../../components/PageHeader.vue'
import { NInput, NButton, NForm, NFormItem, NSelect, NSwitch, NTag, NSpin, useMessage } from 'naive-ui'
import type { SelectOption } from 'naive-ui'

const auth = useAuthStore()
const message = useMessage()

const loading = ref(true)
const saving = ref(false)

const nickname = ref('')
const grade = ref('')
const bio = ref('')
const skills = ref<string[]>([])
const allowMatch = ref(true)
const links = ref<{ label: string; url: string }[]>([])

// 词表：分类 → 技术（两级）
const skillOptions = ref<SelectOption[]>([])
const customSkill = ref('')

async function load() {
  loading.value = true
  try {
    const [me, cats] = await Promise.all([
      api<{
        nickname?: string
        grade?: string
        bio?: string
        skills?: string[]
        allowMatch?: boolean
        links?: { label: string; url: string }[]
      }>('/api/me'),
      api<{ name: string; skills: string[] }[]>('/api/skills'),
    ])
    nickname.value = me.nickname ?? ''
    grade.value = me.grade ?? ''
    bio.value = me.bio ?? ''
    skills.value = me.skills ?? []
    allowMatch.value = me.allowMatch ?? true
    links.value = me.links ?? []

    skillOptions.value = cats.map((c) => ({
      type: 'group',
      label: c.name,
      key: c.name,
      options: c.skills.map((s) => ({ label: s, value: s })),
    }))
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    await api('/api/me', {
      method: 'PATCH',
      body: JSON.stringify({
        nickname: nickname.value,
        grade: grade.value,
        bio: bio.value,
        skills: skills.value,
        allowMatch: allowMatch.value,
        links: links.value.filter((l) => l.label && l.url),
      }),
    })
    // 同步顶部昵称
    auth.user = { ...auth.user!, nickname: nickname.value }
    message.success('资料已保存')
  } catch (e) {
    message.error((e as Error).message)
  } finally {
    saving.value = false
  }
}

function addCustomSkill() {
  const s = customSkill.value.trim()
  if (s && !skills.value.includes(s)) {
    skills.value = [...skills.value, s]
  }
  customSkill.value = ''
}

function addLink() {
  links.value = [...links.value, { label: '', url: '' }]
}

function removeSkill(s: string) {
  skills.value = skills.value.filter((x) => x !== s)
}

onMounted(load)
</script>

<template>
  <section class="wrap">
    <page-header title="个人资料" sub="技能会进入匹配池 — 点子缺人时系统会通知你" />

    <n-spin v-if="loading" class="spin" />
    <n-form v-else class="form" label-placement="top">
      <n-form-item label="昵称">
        <n-input v-model:value="nickname" placeholder="对外展示名称" maxlength="30" />
      </n-form-item>
      <n-form-item label="年级">
        <n-input v-model:value="grade" placeholder="如 2024" maxlength="10" class="short" />
      </n-form-item>
      <n-form-item label="一句话签名">
        <n-input v-model:value="bio" type="textarea" :rows="2" placeholder="介绍你自己" maxlength="200" />
      </n-form-item>

      <n-form-item label="技能（词表选择 + 自定义）">
        <n-select
          v-model:value="skills"
          multiple
          filterable
          tag
          :options="skillOptions"
          :children-field="'options'"
          placeholder="从分类中选择，或输入自定义标签"
          class="full"
        />
        <div class="custom-row">
          <n-input v-model:value="customSkill" placeholder="自定义技能" size="small" class="custom-input" @keyup.enter="addCustomSkill" />
          <n-button size="small" @click="addCustomSkill">添加</n-button>
        </div>
        <div v-if="skills.length" class="skill-tags">
          <n-tag v-for="s in skills" :key="s" size="small" closable :bordered="false" class="stag" @close="removeSkill(s)">
            {{ s }}
          </n-tag>
        </div>
      </n-form-item>

      <n-form-item label="项目匹配邀请">
        <div class="match-row">
          <n-switch v-model:value="allowMatch" />
          <span class="match-label">
            {{ allowMatch ? '开启 — 点子缺你的技能时你会收到通知' : '关闭 — 不进匹配池' }}
          </span>
        </div>
      </n-form-item>

      <n-form-item label="外链">
        <div class="links">
          <div v-for="(l, i) in links" :key="i" class="link-row">
            <n-input v-model:value="l.label" placeholder="名称（GitHub/Blog/掘金…）" size="small" class="l-label" />
            <n-input v-model:value="l.url" placeholder="https://…" size="small" class="l-url" />
            <n-button size="small" quaternary type="error" @click="links.splice(i, 1)">删</n-button>
          </div>
          <n-button size="small" quaternary @click="addLink">＋ 添加外链</n-button>
        </div>
      </n-form-item>

      <n-button type="primary" :loading="saving" class="save" @click="save">保存资料</n-button>
    </n-form>
  </section>
</template>

<style scoped>
.wrap {
  max-width: 640px;
}
.spin {
  display: block;
  margin: 48px auto;
}
.form {
  background: var(--cs-surface-1);
  border: 1px solid var(--cs-hairline);
  border-radius: 8px;
  padding: 24px;
}
.short {
  width: 160px;
}
.full {
  width: 100%;
}
.custom-row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  width: 100%;
}
.custom-input {
  flex: 1;
}
.skill-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 10px;
}
.stag {
  background: rgba(88, 166, 255, 0.1);
  color: var(--cs-accent);
}
.match-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.match-label {
  color: var(--cs-ink-subtle);
  font-size: 13px;
}
.links {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.link-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.l-label {
  width: 120px;
}
.l-url {
  flex: 1;
}
.save {
  width: 100%;
}
</style>
