<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthStore } from '../../stores/auth'

interface PostItem {
  id: string
  board: string
  title: string
  content: string
  author: { id: string; nickname: string }
  commentCount: number
  likeCount: number
  liked: boolean
  createdAt: string
}

const auth = useAuthStore()
const posts = ref<PostItem[]>([])
const board = ref('')
const error = ref('')

const boardLabel: Record<string, string> = { GENERAL: '灌水', HELP: '求助', SHARE: '分享', RECRUIT: '招人' }

async function load() {
  const qs = board.value ? `?board=${board.value}` : ''
  const res = await fetch(`/api/posts${qs}`, { headers: { Authorization: `Bearer ${auth.token}` } })
  if (!res.ok) {
    error.value = `加载失败: ${res.status}`
    return
  }
  posts.value = (await res.json()) as PostItem[]
}

onMounted(load)
</script>

<template>
  <section>
    <div class="head">
      <h1 class="title">社区</h1>
      <RouterLink to="/posts/new" class="new">＋ 发帖</RouterLink>
    </div>
    <div class="filters">
      <button v-for="(label, key) in boardLabel" :key="key" class="fb" :class="{ on: board === key }" @click="board = board === key ? '' : key; load()">
        {{ label }}
      </button>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <div class="list">
      <RouterLink v-for="p in posts" :key="p.id" :to="`/posts/${p.id}`" class="item">
        <span class="badge" :class="p.board.toLowerCase()">{{ boardLabel[p.board] }}</span>
        <h3>{{ p.title }}</h3>
        <p class="preview">{{ p.content }}</p>
        <p class="meta">
          {{ p.author.nickname }} · {{ p.createdAt.slice(0, 16).replace('T', ' ') }}
          · 💬 {{ p.commentCount }} · 👍 {{ p.likeCount }}
        </p>
      </RouterLink>
    </div>
    <p v-if="!posts.length && !error" class="empty">还没有帖子，来发第一帖？</p>
  </section>
</template>

<style scoped>
.head { display: flex; justify-content: space-between; align-items: center; }
.title { font-size: 22px; margin-bottom: 8px; }
.new { color: var(--accent); text-decoration: none; font-size: 14px; }
.filters { display: flex; gap: 8px; margin-bottom: 16px; }
.fb { background: transparent; border: 1px solid var(--border); border-radius: 999px; padding: 4px 14px; color: var(--muted); cursor: pointer; font-size: 12px; }
.fb.on { color: var(--accent); border-color: var(--accent); }
.list { display: flex; flex-direction: column; gap: 10px; }
.item { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 14px 16px; text-decoration: none; color: var(--fg); }
.item:hover { border-color: var(--accent); }
.badge { font-size: 11px; padding: 2px 8px; border-radius: 999px; margin-right: 8px; }
.badge.help { color: #f85149; border: 1px solid #f85149; }
.badge.share { color: #3fb950; border: 1px solid #3fb950; }
.badge.recruit { color: #d29922; border: 1px solid #d29922; }
.badge.general { color: var(--muted); border: 1px solid var(--muted); }
.item h3 { display: inline; font-size: 15px; }
.preview { color: var(--muted); font-size: 13px; margin-top: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.meta { color: var(--muted); font-size: 12px; margin-top: 8px; }
.error { color: #f85149; font-size: 13px; margin-bottom: 10px; }
.empty { color: var(--muted); font-size: 14px; }
</style>
