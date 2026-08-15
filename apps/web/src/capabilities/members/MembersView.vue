<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

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

async function load() {
  const res = await fetch('/api/members')
  if (!res.ok) {
    error.value = `加载失败: ${res.status}`
    return
  }
  members.value = (await res.json()) as Member[]
}

/** 按年级分组（Vidar 模式：25级 → 24级 → …） */
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
    <h1 class="title">成员</h1>
    <p class="sub">开发部成员一览 — 点击 GitHub 查看他们的作品与代码。</p>
    <p v-if="error" class="error">{{ error }}</p>

    <div v-for="[grade, list] in groups" :key="grade" class="group">
      <h2 class="grade-title">{{ grade }}级</h2>
      <div class="grid">
        <div v-for="m in list" :key="m.id" class="card">
          <div class="avatar">{{ m.nickname.slice(0, 1).toUpperCase() }}</div>
          <h3>{{ m.nickname }}</h3>
          <p v-if="m.bio" class="bio">{{ m.bio }}</p>
          <div class="tags">
            <span v-for="s in m.skills.slice(0, 4)" :key="s" class="tag">{{ s }}</span>
          </div>
          <div class="links">
            <a v-if="m.github" :href="`https://github.com/${m.github}`" target="_blank" rel="noopener">GitHub</a>
            <a v-for="l in m.links" :key="l.url" :href="l.url" target="_blank" rel="noopener">{{ l.label }}</a>
          </div>
        </div>
      </div>
    </div>
    <p v-if="!members.length && !error" class="empty">暂无成员</p>
  </section>
</template>

<style scoped>
.title { font-size: 22px; margin-bottom: 6px; }
.sub { color: var(--muted); font-size: 13px; margin-bottom: 20px; }
.group { margin-bottom: 24px; }
.grade-title { font-size: 15px; color: var(--muted); margin-bottom: 12px; letter-spacing: 1px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
.card { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 16px; text-align: center; }
.card:hover { border-color: var(--accent); }
.avatar { width: 48px; height: 48px; border-radius: 50%; background: rgba(88, 166, 255, 0.15); color: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; margin: 0 auto 10px; }
.card h3 { font-size: 15px; margin-bottom: 8px; }
.bio { color: var(--muted); font-size: 12px; margin-bottom: 10px; min-height: 32px; line-height: 1.5; }
.tags { display: flex; gap: 4px; justify-content: center; flex-wrap: wrap; margin-bottom: 12px; }
.tag { font-size: 11px; color: var(--accent); background: rgba(88, 166, 255, 0.1); padding: 1px 8px; border-radius: 999px; }
.links { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
.links a { color: var(--accent); font-size: 12px; text-decoration: none; }
.links a:hover { text-decoration: underline; }
.error { color: #f85149; font-size: 13px; }
.empty { color: var(--muted); font-size: 14px; }
</style>
