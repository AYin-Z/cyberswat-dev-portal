<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { api } from '../../lib/api'
import { NTag, NInput, NButton, NSpin, NModal, NForm, NFormItem, useDialog, useMessage } from 'naive-ui'

const auth = useAuthStore()
const route = useRoute()
const message = useMessage()
const dialog = useDialog()
const post = ref<any>(null)
const error = ref('')
const loading = ref(true)
const commentText = ref('')
const submitting = ref(false)

// 🟡-4：举报原因弹窗（替代原生 window.prompt）
const showReport = ref(false)
const reportReason = ref('')
const reporting = ref(false)

const boardLabel: Record<string, string> = { GENERAL: '灌水', HELP: '求助', SHARE: '分享', RECRUIT: '招人' }

async function load() {
  loading.value = true
  try {
    post.value = await api(`/api/posts/${route.params.id}`)
  } catch (e) {
    error.value = `加载失败: ${(e as Error).message}`
  } finally {
    loading.value = false
  }
}

async function comment() {
  if (!commentText.value.trim()) return
  submitting.value = true
  try {
    await api(`/api/posts/${post.value.id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content: commentText.value }),
    })
    commentText.value = ''
    await load()
  } catch (e) {
    message.error((e as Error).message)
  } finally {
    submitting.value = false
  }
}

async function like() {
  try {
    await api(`/api/posts/${post.value.id}/like`, { method: 'POST' })
    await load()
  } catch (e) {
    message.error((e as Error).message)
  }
}

async function report() {
  reportReason.value = ''
  showReport.value = true
}

async function confirmReport() {
  if (!reportReason.value.trim()) {
    message.warning('请填写举报原因')
    return
  }
  reporting.value = true
  try {
    await api(`/api/moderation/report/post/${post.value.id}`, {
      method: 'POST',
      body: JSON.stringify({ reason: reportReason.value.trim() }),
    })
    message.success('已提交举报，部长将处置')
    showReport.value = false
  } catch (e) {
    message.error((e as Error).message)
  } finally {
    reporting.value = false
  }
}

async function removePost() {
  // 🟡-4：删除确认走 n-dialog（替代原生 window.confirm）
  dialog.warning({
    title: '删除帖子',
    content: '确认删除该帖子？（软删除，可留审计）',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await api(`/api/moderation/post/${post.value.id}`, { method: 'DELETE' })
        message.success('已删除')
        await load()
      } catch (e) {
        message.error((e as Error).message)
      }
    },
  })
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
          <p class="c-meta">
            {{ c.author.nickname }}
            <span v-if="c.authorViaAgent" class="ai-badge">🤖 AI 代发</span>
            · {{ c.createdAt.slice(0, 16).replace('T', ' ') }}
          </p>
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

    <!-- 🟡-4：举报原因弹窗 -->
    <n-modal v-model:show="showReport" preset="card" title="举报帖子" style="width: 440px; max-width: calc(100vw - 32px)">
      <n-form label-placement="top">
        <n-form-item label="举报原因">
          <n-input
            v-model:value="reportReason"
            type="textarea"
            :rows="3"
            placeholder="违规内容 / 原因说明"
            maxlength="200"
            show-count
          />
        </n-form-item>
        <n-button type="error" block :loading="reporting" @click="confirmReport">提交举报</n-button>
      </n-form>
    </n-modal>
  </section>
</template>

<style scoped>
.wrap {
  max-width: 720px;
}
.ai-badge {
  font-size: 12px; /* 🟡-11：11px → 12px */
  color: var(--cs-accent);
  border: 1px solid var(--cs-hairline);
  border-radius: 4px;
  padding: 0 6px;
  margin-left: 4px;
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
  font-size: 15px; /* 🟡-11：16px → 15px（cardTitle 档） */
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
