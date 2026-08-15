<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

interface CommentItem {
  id: string
  content: string
  author: { id: string; nickname: string }
  createdAt: string
}

const auth = useAuthStore()
const route = useRoute()
const post = ref<any>(null)
const error = ref('')
const commentText = ref('')

async function load() {
  const res = await fetch(`/api/posts/${route.params.id}`, { headers: { Authorization: `Bearer ${auth.token}` } })
  if (!res.ok) {
    error.value = `加载失败: ${res.status}`
    return
  }
  post.value = await res.json()
}

async function comment() {
  if (!commentText.value.trim()) return
  await fetch(`/api/posts/${post.value.id}/comments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: commentText.value }),
  })
  commentText.value = ''
  await load()
}

async function like() {
  await fetch(`/api/posts/${post.value.id}/like`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth.token}` },
  })
  await load()
}

onMounted(load)
</script>

<template>
  <section v-if="post" class="wrap">
    <p class="board">{{ post.board }}</p>
    <h1 class="title">{{ post.title }}</h1>
    <p class="meta">{{ post.author.nickname }} · {{ post.createdAt.slice(0, 16).replace('T', ' ') }}</p>
    <p class="content">{{ post.content }}</p>
    <button class="like" :class="{ on: post.liked }" @click="like">👍 {{ post.likeCount }}</button>

    <h2 class="sec">评论（{{ post.commentCount }}）</h2>
    <div class="comments">
      <div v-for="c in post.comments" :key="c.id" class="c">
        <p class="c-meta">{{ c.author.nickname }} · {{ c.createdAt.slice(0, 16).replace('T', ' ') }}</p>
        <p class="c-content">{{ c.content }}</p>
      </div>
      <p v-if="!post.comments.length" class="empty">暂无评论</p>
    </div>
    <form class="c-form" @submit.prevent="comment">
      <input v-model="commentText" placeholder="写评论…（@昵称 可提及成员）" />
      <button type="submit">评论</button>
    </form>
  </section>
  <p v-else-if="error" class="error">{{ error }}</p>
</template>

<style scoped>
.wrap { max-width: 720px; }
.board { color: var(--accent); font-size: 12px; letter-spacing: 1px; margin-bottom: 6px; }
.title { font-size: 24px; margin-bottom: 6px; }
.meta { color: var(--muted); font-size: 12px; margin-bottom: 16px; }
.content { line-height: 1.9; margin-bottom: 16px; white-space: pre-wrap; }
.like { background: transparent; border: 1px solid var(--border); border-radius: 999px; padding: 6px 16px; color: var(--muted); cursor: pointer; }
.like.on { color: var(--accent); border-color: var(--accent); }
.sec { font-size: 16px; margin: 24px 0 12px; }
.comments { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
.c { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 12px 14px; }
.c-meta { color: var(--muted); font-size: 12px; margin-bottom: 6px; }
.c-content { font-size: 14px; }
.empty { color: var(--muted); font-size: 13px; }
.c-form { display: flex; gap: 8px; }
.c-form input { flex: 1; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 10px; color: var(--fg); }
.c-form button { background: var(--accent); border: none; border-radius: 6px; padding: 0 18px; color: #fff; cursor: pointer; }
.error { color: #f85149; }
</style>
