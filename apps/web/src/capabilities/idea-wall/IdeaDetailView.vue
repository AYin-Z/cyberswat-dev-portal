<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../../lib/api'
import StatusBadge from '../../components/StatusBadge.vue'
import { NTag, NButton, NInput, NSpin, useMessage } from 'naive-ui'

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
  author: { id: string; nickname: string; grade: string | null }
  joinerCount: number
  joined: boolean
  createdAt: string
  joiners: Joiner[]
}

const route = useRoute()
const message = useMessage()
const idea = ref<IdeaDetail | null>(null)
const error = ref('')
const loading = ref(true)
const joinMessage = ref('')
const showJoinForm = ref(false)

async function load() {
  loading.value = true
  try {
    idea.value = await api<IdeaDetail>(`/api/ideas/${route.params.id}`)
  } catch (e) {
    error.value = `加载失败: ${(e as Error).message}`
  } finally {
    loading.value = false
  }
}

async function join() {
  try {
    await api(`/api/ideas/${idea.value!.id}/join`, {
      method: 'POST',
      body: JSON.stringify({ message: joinMessage.value }),
    })
    message.success('已申请加入')
    showJoinForm.value = false
    await load()
  } catch (e) {
    message.error((e as Error).message)
  }
}

onMounted(load)
</script>

<template>
  <section class="detail">
    <n-spin v-if="loading" class="spin" />
    <p v-else-if="error" class="error">{{ error }}</p>

    <template v-else-if="idea">
      <div class="head">
        <status-badge :status="idea.status" type="idea" />
        <span class="joiners tnum">{{ idea.joinerCount }} 人已加入</span>
      </div>
      <h1 class="title">{{ idea.title }}</h1>
      <p class="desc">{{ idea.description }}</p>
      <div class="need-box">🔧 需要：{{ idea.need }}</div>
      <div class="tags">
        <n-tag v-for="t in idea.techStack" :key="t" size="small" :bordered="false" class="tag">{{ t }}</n-tag>
      </div>
      <p class="meta">
        发起人：{{ idea.author.nickname }}
        <template v-if="idea.author.grade">（{{ idea.author.grade }}级）</template>
        · {{ idea.createdAt.slice(0, 10) }}
      </p>

      <div v-if="!idea.joined && idea.status !== 'PROMOTED' && idea.status !== 'ARCHIVED'" class="join-zone">
        <n-button v-if="!showJoinForm" type="primary" @click="showJoinForm = true">＋ 我想加入</n-button>
        <div v-else class="join-form">
          <n-input v-model:value="joinMessage" placeholder="我能做什么？（技能/时间）" />
          <n-button type="primary" @click="join">确认加入</n-button>
        </div>
      </div>
      <p v-else-if="idea.joined" class="joined-hint">✓ 你已加入这个点子</p>

      <h2 class="sec">加入者</h2>
      <div v-if="idea.joiners.length" class="joiners-list">
        <div v-for="j in idea.joiners" :key="j.userId" class="joiner">
          <div class="joiner-head">
            <span class="name">{{ j.nickname }}</span>
            <span v-if="j.grade" class="grade">{{ j.grade }}级</span>
            <n-tag v-for="s in j.skills.slice(0, 3)" :key="s" size="tiny" :bordered="false" class="tag">{{ s }}</n-tag>
          </div>
          <p v-if="j.message" class="msg">"{{ j.message }}"</p>
        </div>
      </div>
      <p v-else class="empty">还没有人加入，快来响应招募</p>
    </template>
  </section>
</template>

<style scoped>
.detail {
  max-width: 720px;
}
.spin {
  display: block;
  margin: 48px auto;
}
.error {
  color: var(--cs-danger);
}
.head {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}
.joiners {
  color: var(--cs-ink-subtle);
  font-size: 13px;
}
.title {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.4px;
  margin-bottom: 14px;
}
.desc {
  line-height: 1.8;
  margin-bottom: 14px;
}
.need-box {
  background: rgba(210, 153, 34, 0.08);
  border: 1px solid rgba(210, 153, 34, 0.4);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 14px;
  margin-bottom: 12px;
}
.tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.tag {
  background: rgba(88, 166, 255, 0.1);
  color: var(--cs-accent);
}
.meta {
  color: var(--cs-ink-subtle);
  font-size: 13px;
  margin-bottom: 24px;
}
.join-zone {
  margin: 20px 0;
}
.join-form {
  display: flex;
  gap: 8px;
  align-items: center;
}
.join-form .n-input {
  flex: 1;
}
.joined-hint {
  color: var(--cs-success);
  font-size: 14px;
  margin: 16px 0;
}
.sec {
  font-size: 16px;
  font-weight: 600;
  margin: 24px 0 12px;
}
.joiners-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.joiner {
  background: var(--cs-surface-1);
  border: 1px solid var(--cs-hairline);
  border-radius: 8px;
  padding: 12px 14px;
}
.joiner-head {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 6px;
  flex-wrap: wrap;
}
.name {
  font-weight: 500;
  font-size: 14px;
}
.grade {
  color: var(--cs-ink-subtle);
  font-size: 12px;
}
.msg {
  color: var(--cs-ink-muted);
  font-size: 13px;
  font-style: italic;
}
.empty {
  color: var(--cs-ink-subtle);
  font-size: 13px;
}
</style>
