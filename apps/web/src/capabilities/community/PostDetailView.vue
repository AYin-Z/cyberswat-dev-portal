<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { NTag, NInput, NButton, NSpin, useMessage } from 'naive-ui'

const auth = useAuthStore()
const route = useRoute()
const message = useMessage()
const post = ref<any>(null)
const error = ref('')
const loading = ref(true)
const commentText = ref('')
const submitting = ref(false)

const boardLabel: Record<string, string> = { GENERAL: '灌水', HELP: '求助', SHARE: '分享', RECRUIT: '招人' }

async function load() {
  loading.value = true
  const res = await fetch(`/api/posts/${route.params.id}`, {
    headers: { Authorization: `Bearer ${auth.token}` },
  })
  if (!res.ok) {
    error.value = `加载失败: ${res.status}`
    loading.value = false
    return
  }
  post.value = await res.json()
  loading.value = false
}

async function comment() {
  if (!commentText.value.trim()) return
  submitting.value = true
  const res = await fetch(`/api/posts/${post.value.id}/comments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: commentText.value }),
  })
  if (!res.ok) {
    message.error('评论失败')
    submitting.value = false
    return
  }
  commentText.value = ''
  submitting.value = false
  await load()
}

async function like() {
  await fetch(`/api/posts/${post.value.id}/like`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth.token}` },
  })
  await load()
}

async function report() {
  const reason = window.prompt('举报原因：') ?? ''
  if (!reason.trim()) return
  const res = await fetch(`/api/moderation/report/post/${post.value.id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  })
  if (res.ok) message.success('已提交举报，部长将处置')
  else message.error('举报失败')
}

async function removePost() {
  if (!window.confirm('确认删除该帖子？（软删除，可留审计）')) return
  const res = await fetch(`/api/moderation/post/${post.value.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${auth.token}` },
  })
  if (res.ok) {
    message.success('已删除')
    await load()
  } else {
    message.error('删除失败（只能删自己的或部长）')
  }
}

onMounted(load)
</script>

<template>
  <section class="wrap">
    <n-spin v-if="loading" class="spin" />
    <p v-else-if="error" class="error">{{ error }}</p>

    <template v-else-if="post">
      <n-tag size="small" :bordered="false" class="b">{{ boardLabel[post.board] }}</n-tag>
      <h1 class="title">{{ post.title }}</h1>
      <p class="meta">{{ post.author.nickname }} · {{ post.createdAt.slice(0, 16).replace('T', ' ') }}</p>
      <p class="content">{{ post.content }}</p>

      <div class="post-actions">
        <n-button size="small" :type="post.liked ? 'primary' : 'default'" quaternary @click="like">
          👍 {{ post.likeCount }}
        </n-button>
        <n-button size="small" quaternary @click="report">举报</n-button>
        <n-button
          v-if="auth.user?.id === post.author.id || auth.user?.role === 'dept-leader' || auth.user?.role === 'admin'"
          size="small"
          quaternary
          type="error"
          @click="removePost"
        >
          删除
        </n-button>
      </div>

      <h2 class="sec tnum">评论（{{ post.commentCount }}）</h2>
      <div class="comments">
        <div v-for="c in post.comments" :key="c.id" class="c">
          <p class="c-meta">{{ c.author.nickname }} · {{ c.createdAt.slice(0, 16).replace('T', ' ') }}</p>
          <p class="c-content">{{ c.content }}</p>
        </div>
        <p v-if="!post.comments.length" class="empty">暂无评论</p>
      </div>

      <div class="c-form">
        <n-input
          v-model:value="commentText"
          placeholder="写评论…（@昵称 可提及成员）"
          @keyup.enter="comment"
        />
        <n-button type="primary" :loading="submitting" @click="comment">评论</n-button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.wrap {
  max-width: 720px;
}
.post-actions {
  display: flex;
  gap: 4px;
  align-items: center;
}
.spin {
  display: block;
  margin: 48px auto;
}
.error {
  color: var(--cs-danger);
}
.b {
  margin-bottom: 8px;
}
.title {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.4px;
  margin: 8px 0 6px;
}
.meta {
  color: var(--cs-ink-subtle);
  font-size: 12px;
  margin-bottom: 16px;
}
.content {
  line-height: 1.9;
  margin-bottom: 16px;
  white-space: pre-wrap;
}
.sec {
  font-size: 16px;
  font-weight: 600;
  margin: 24px 0 12px;
}
.comments {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}
.c {
  background: var(--cs-surface-1);
  border: 1px solid var(--cs-hairline);
  border-radius: 8px;
  padding: 12px 14px;
}
.c-meta {
  color: var(--cs-ink-subtle);
  font-size: 12px;
  margin-bottom: 6px;
}
.c-content {
  font-size: 14px;
}
.empty {
  color: var(--cs-ink-subtle);
  font-size: 13px;
}
.c-form {
  display: flex;
  gap: 8px;
  align-items: center;
}
.c-form .n-input {
  flex: 1;
}
</style>
