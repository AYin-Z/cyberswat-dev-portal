<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import EmptyState from '../../components/EmptyState.vue'
import { NTag, NSpin } from 'naive-ui'

interface Member {
  id: string
  nickname: string
  grade: string
  skills: string[]
  bio?: string
  links: { label: string; url: string }[]
  avatarUrl?: string
  github?: string
}

const members = ref<Member[]>([])
const error = ref('')
const loading = ref(true)

async function load() {
  const res = await fetch('/api/members')
  if (!res.ok) {
    error.value = `加载失败: ${res.status}`
    loading.value = false
    return
  }
  members.value = (await res.json()) as Member[]
  loading.value = false
}

const groups = computed(() => {
  const map = new Map<string, Member[]>()
  for (const m of members.value) {
    const key = m.grade || '未知年级'
    const arr = map.get(key) ?? []
    arr.push(m)
    map.set(key, arr)
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
})

onMounted(load)
</script>

<template>
  <section>
    <page-header title="成员" sub="开发部成员一览 — GitHub 查看作品与代码" />

    <p v-if="error" class="error">{{ error }}</p>
    <n-spin v-if="loading" class="spin" />

    <template v-else>
      <div v-for="[grade, list] in groups" :key="grade" class="group">
        <h2 class="grade-title">{{ grade }}级</h2>
        <div class="grid">
          <div v-for="m in list" :key="m.id" class="card">
            <div class="avatar">{{ m.nickname.slice(0, 1).toUpperCase() }}</div>
            <h3 class="name">{{ m.nickname }}</h3>
            <p v-if="m.bio" class="bio">{{ m.bio }}</p>
            <div class="tags">
              <n-tag v-for="s in m.skills.slice(0, 4)" :key="s" size="tiny" :bordered="false" class="tag">{{ s }}</n-tag>
            </div>
            <div class="links">
              <a v-if="m.github" :href="`https://github.com/${m.github}`" target="_blank" rel="noopener">GitHub</a>
              <a v-for="l in m.links" :key="l.url" :href="l.url" target="_blank" rel="noopener">{{ l.label }}</a>
            </div>
          </div>
        </div>
      </div>
      <empty-state v-if="!members.length" text="暂无成员" />
    </template>
  </section>
</template>

<style scoped>
.error {
  color: var(--cs-danger);
  font-size: 13px;
  margin-bottom: 12px;
}
.spin {
  display: block;
  margin: 48px auto;
}
.group {
  margin-bottom: 24px;
}
.grade-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--cs-ink-subtle);
  margin-bottom: 12px;
  letter-spacing: 1px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}
.card {
  background: var(--cs-surface-1);
  border: 1px solid var(--cs-hairline);
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  transition: background 0.15s, border-color 0.15s;
}
.card:hover {
  background: var(--cs-surface-2);
  border-color: var(--cs-hairline-strong);
}
.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--cs-surface-3);
  color: var(--cs-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 600;
  margin: 0 auto 10px;
}
.name {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 8px;
}
.bio {
  color: var(--cs-ink-subtle);
  font-size: 12px;
  margin-bottom: 10px;
  min-height: 32px;
  line-height: 1.5;
}
.tags {
  display: flex;
  gap: 4px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.tag {
  background: rgba(88, 166, 255, 0.1);
  color: var(--cs-accent);
}
.links {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}
.links a {
  color: var(--cs-accent);
  font-size: 12px;
}
.links a:hover {
  text-decoration: underline;
}
</style>
