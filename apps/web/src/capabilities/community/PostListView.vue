<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '../../lib/api'
import PageHeader from '../../components/PageHeader.vue'
import EmptyState from '../../components/EmptyState.vue'
import { NTag, NSpin, NButton } from 'naive-ui'

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

const posts = ref<PostItem[]>([])
const board = ref('')
const error = ref('')
const loading = ref(true)

const boardLabel: Record<string, string> = { GENERAL: '灌水', HELP: '求助', SHARE: '分享', RECRUIT: '招人' }
const boardColor: Record<string, 'default' | 'error' | 'success' | 'warning'> = {
  GENERAL: 'default',
  HELP: 'error',
  SHARE: 'success',
  RECRUIT: 'warning',
}

async function load() {
  loading.value = true
  const qs = board.value ? `?board=${board.value}` : ''
  try {
    posts.value = await api<PostItem[]>(`/api/posts${qs}`)
  } catch (e) {
    error.value = `加载失败: ${(e as Error).message}`
  } finally {
    loading.value = false
  }
}

function toggleBoard(b: string) {
  board.value = board.value === b ? '' : b
  load()
}

onMounted(load)
</script>

<template>
  <section>
    <page-header title="社区" sub="灌水 / 求助 / 分享 / 招人">
      <template #actions>
        <RouterLink to="/posts/new" class="new-link">＋ 发帖</RouterLink>
      </template>
    </page-header>

    <div class="filters">
      <n-button
        v-for="(label, key) in boardLabel"
        :key="key"
        size="tiny"
        :type="board === key ? 'primary' : 'default'"
        quaternary
        @click="toggleBoard(key)"
      >
        {{ label }}
      </n-button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <n-spin v-if="loading" class="spin" />

    <div v-else-if="posts.length" class="list">
      <RouterLink v-for="p in posts" :key="p.id" :to="`/posts/${p.id}`" class="item">
        <n-tag :type="boardColor[p.board]" size="small" :bordered="false" class="b">{{ boardLabel[p.board] }}</n-tag>
        <h3 class="p-title">{{ p.title }}</h3>
        <p class="preview">{{ p.content }}</p>
        <p class="meta tnum">
          {{ p.author.nickname }} · {{ p.createdAt.slice(0, 16).replace('T', ' ') }}
          · 💬 {{ p.commentCount }} · 👍 {{ p.likeCount }}
        </p>
      </RouterLink>
    </div>

    <empty-state v-else text="还没有帖子" cta="来发第一帖" @action="$router.push('/posts/new')" />
  </section>
</template>

<style scoped>
.new-link {
  color: var(--cs-accent);
  font-size: 13px;
  font-weight: 500;
}
.filters {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.error {
  color: var(--cs-danger);
  font-size: 13px;
  margin-bottom: 10px;
}
.spin {
  display: block;
  margin: 48px auto;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.item {
  background: var(--cs-surface-1);
  border: 1px solid var(--cs-hairline);
  border-radius: 8px;
  padding: 14px 16px;
  text-decoration: none;
  color: var(--cs-ink);
  transition: background 0.15s, border-color 0.15s;
}
.item:hover {
  background: var(--cs-surface-2);
  border-color: var(--cs-hairline-strong);
}
.b {
  margin-right: 8px;
}
.p-title {
  display: inline;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: -0.2px;
}
.preview {
  color: var(--cs-ink-subtle);
  font-size: 13px;
  margin-top: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.meta {
  color: var(--cs-ink-subtle);
  font-size: 12px;
  margin-top: 8px;
}
</style>
