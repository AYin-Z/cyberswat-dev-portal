<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

interface Joiner {
  userId: string
  nickname: string
  grade: string | null
  skills: string[]
  message: string | null
  joinedAt: string
}

interface IdeaDetail {
  id: string
  title: string
  description: string
  need: string
  techStack: string[]
  status: string
  author: { id: string; nickname: string; grade: string | null; skills: string[]; bio: string | null }
  joinerCount: number
  joined: boolean
  createdAt: string
  joiners: Joiner[]
}

const auth = useAuthStore()
const route = useRoute()
const idea = ref<IdeaDetail | null>(null)
const error = ref('')
const joinMessage = ref('')
const showJoinForm = ref(false)

const statusLabel: Record<string, string> = {
  RECRUITING: '招募中',
  INCUBATING: '孵化中',
  PROMOTED: '已转正',
  ARCHIVED: '已废弃',
}

async function load() {
  const res = await fetch(`/api/ideas/${route.params.id}`, {
    headers: { Authorization: `Bearer ${auth.token}` },
  })
  if (!res.ok) {
    error.value = `加载失败: ${res.status}`
    return
  }
  idea.value = (await res.json()) as IdeaDetail
}

async function join() {
  const res = await fetch(`/api/ideas/${idea.value!.id}/join`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: joinMessage.value }),
  })
  if (!res.ok) {
    error.value = '加入失败'
    return
  }
  showJoinForm.value = false
  await load()
}

onMounted(load)
</script>

<template>
  <section v-if="idea" class="detail">
    <div class="head">
      <span class="status" :class="idea.status.toLowerCase()">{{ statusLabel[idea.status] }}</span>
      <span class="joiners">{{ idea.joinerCount }} 人已加入</span>
    </div>
    <h1>{{ idea.title }}</h1>
    <p class="desc">{{ idea.description }}</p>
    <div class="need-box">🔧 需要：{{ idea.need }}</div>
    <div class="tags">
      <span v-for="t in idea.techStack" :key="t" class="tag">{{ t }}</span>
    </div>
    <p class="meta">
      发起人：{{ idea.author.nickname }}
      <span v-if="idea.author.grade">（{{ idea.author.grade }}级）</span>
      · {{ idea.createdAt.slice(0, 10) }}
    </p>

    <div v-if="!idea.joined && idea.status !== 'PROMOTED' && idea.status !== 'ARCHIVED'" class="join-zone">
      <button v-if="!showJoinForm" class="primary" @click="showJoinForm = true">＋ 我想加入</button>
      <form v-else class="join-form" @submit.prevent="join">
        <input v-model="joinMessage" placeholder="我能做什么？（技能/时间）" />
        <button class="primary" type="submit">确认加入</button>
      </form>
    </div>
    <p v-else-if="idea.joined" class="joined-hint">✅ 你已加入这个点子</p>
    <p v-else class="joined-hint">{{ statusLabel[idea.status] }}，暂不能加入</p>

    <h2 class="sec-title">加入者</h2>
    <div v-if="idea.joiners.length" class="joiners-list">
      <div v-for="j in idea.joiners" :key="j.userId" class="joiner">
        <div class="joiner-head">
          <span class="name">{{ j.nickname }}</span>
          <span v-if="j.grade" class="grade">{{ j.grade }}级</span>
          <span v-for="s in j.skills" :key="s" class="tag">{{ s }}</span>
        </div>
        <p v-if="j.message" class="msg">"{{ j.message }}"</p>
      </div>
    </div>
    <p v-else class="empty">还没有人加入，快来响应招募</p>
  </section>
  <p v-else-if="error" class="error">{{ error }}</p>
</template>

<style scoped>
.detail { max-width: 720px; }
.head { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; }
.status { font-size: 12px; padding: 2px 10px; border-radius: 999px; }
.status.recruiting { color: #3fb950; border: 1px solid #3fb950; }
.status.incubating { color: #58a6ff; border: 1px solid #58a6ff; }
.status.promoted { color: #d29922; border: 1px solid #d29922; }
.status.archived { color: var(--muted); border: 1px solid var(--muted); }
.joiners { color: var(--muted); font-size: 13px; }
h1 { font-size: 24px; margin-bottom: 14px; }
.desc { line-height: 1.8; color: var(--fg); margin-bottom: 14px; }
.need-box { background: rgba(210, 153, 34, 0.08); border: 1px solid rgba(210, 153, 34, 0.4); border-radius: 8px; padding: 10px 14px; font-size: 14px; margin-bottom: 12px; }
.tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
.tag { font-size: 12px; color: var(--accent); background: rgba(88, 166, 255, 0.1); padding: 2px 8px; border-radius: 999px; }
.meta { color: var(--muted); font-size: 13px; margin-bottom: 24px; }
.join-zone { margin: 20px 0; }
.primary { background: var(--accent); border: none; border-radius: 6px; padding: 10px 18px; color: #fff; cursor: pointer; font-weight: 600; }
.join-form { display: flex; gap: 8px; }
.join-form input { flex: 1; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 9px; color: var(--fg); }
.joined-hint { color: #3fb950; font-size: 14px; margin: 16px 0; }
.sec-title { font-size: 16px; margin: 24px 0 12px; }
.joiners-list { display: flex; flex-direction: column; gap: 10px; }
.joiner { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 12px 14px; }
.joiner-head { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; }
.name { font-weight: 600; font-size: 14px; }
.grade { color: var(--muted); font-size: 12px; }
.msg { color: var(--muted); font-size: 13px; font-style: italic; }
.empty { color: var(--muted); font-size: 13px; }
.error { color: #f85149; }
</style>
