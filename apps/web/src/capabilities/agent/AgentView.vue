<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { api } from '../../lib/api'
import PageHeader from '../../components/PageHeader.vue'
import { NTag, NSpin, NCollapse, NCollapseItem, useMessage } from 'naive-ui'

const auth = useAuthStore()
const message = useMessage()
const tools = ref<{ id: string; description: string; requiresApproval: boolean }[]>([])
const loading = ref(true)
const copied = ref('')
const registering = ref(false)
const authorizedClients = ref<{ id: string; name: string; scope: string }[]>([])

async function load() {
  try {
    tools.value = await api<{ id: string; description: string; requiresApproval: boolean }[]>('/api/tools')
  } catch (e) {
    message.error((e as Error).message)
  } finally {
    loading.value = false
  }
}

const origin = window.location.origin
const mcpUrl = computed(() => (window.location.protocol === 'https:' ? origin : 'http://127.0.0.1:8094'))

const configs = computed(() => ({
  claude: `{
  "mcpServers": {
    "cyberswat-dev": {
      "url": "${mcpUrl.value}/mcp",
      "oauth": { "client": { "client_name": "我的开发部助手" } }
    }
  }
}`,
  cursor: `# ~/.cursor/mcp.json
{
  "mcpServers": {
    "cyberswat-dev": {
      "url": "${mcpUrl.value}/mcp",
      "oauth": { "client": { "client_name": "我的开发部助手" } }
    }
  }
}`,
  hermes: `# ~/.hermes/config.yaml
mcp_servers:
  cyberswat-dev:
    url: ${mcpUrl.value}/mcp
    auth: oauth
`,
}))

async function copy(key: string) {
  const text = configs.value[key as keyof typeof configs.value]
  try {
    await navigator.clipboard.writeText(text)
    message.success('配置已复制')
  } catch {
    message.info(text)
  }
}

async function startAuth() {
  // 🟡-3：先 DCR 注册客户端 → 再跳授权页（授权完成后在 callback 页面完成）
  registering.value = true
  try {
    const res = await fetch(`${mcpUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        redirect_uris: [`${origin}/agent`],
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        client_name: '我的开发部助手',
      }),
    })
    if (!res.ok) {
      message.error('客户端注册失败，请确认已配置 MCP 服务')
      return
    }
    const data = await res.json()
    localStorage.setItem('agent_client_id', data.client_id)
    localStorage.setItem('agent_client_secret', data.client_secret)
    // 跳转授权（带 state 防 CSRF）
    const state = Math.random().toString(36).slice(2)
    sessionStorage.setItem('agent_oauth_state', state)
    const verifier = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
    const challenge = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
      .then((buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''))
    localStorage.setItem('agent_verifier', verifier)
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: data.client_id,
      redirect_uri: `${origin}/agent`,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state,
      scope: 'announcement.view idea.view task.view post.view notification.view',
    })
    window.location.href = `${mcpUrl}/authorize?${params}`
  } finally {
    registering.value = false
  }
}

function handleCallback() {
  // 授权回调：/agent?code=xxx&state=xxx
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const state = params.get('state')
  if (!code) return
  const expected = sessionStorage.getItem('agent_oauth_state')
  if (expected && state !== expected) {
    message.error('state 校验失败')
    history.replaceState(null, '', '/agent')
    return
  }
  sessionStorage.removeItem('agent_oauth_state')
  // 用 code 换 token 并存储
  exchangeCode(code)
  history.replaceState(null, '', '/agent')
}

async function exchangeCode(code: string) {
  const clientId = localStorage.getItem('agent_client_id') ?? ''
  const verifier = localStorage.getItem('agent_verifier') ?? ''
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: `${origin}/agent`,
    client_id: clientId,
    code_verifier: verifier,
  })
  const res = await fetch(`${mcpUrl}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (res.ok) {
    const data = await res.json()
    localStorage.setItem('agent_access', data.access_token)
    message.success('授权成功！你的 AI 助手已获得访问令牌')
  } else {
    message.error('令牌交换失败')
  }
}

async function revokeAuth() {
  localStorage.removeItem('agent_access')
  localStorage.removeItem('agent_client_id')
  localStorage.removeItem('agent_client_secret')
  localStorage.removeItem('agent_verifier')
  message.success('已撤销本地授权')
}

onMounted(() => {
  load()
  handleCallback()
  const hasToken = localStorage.getItem('agent_access')
  if (hasToken) {
    authorizedClients.value = [{ id: localStorage.getItem('agent_client_id') ?? 'agent', name: '我的开发部助手', scope: '已授权' }]
  }
})
</script>

<template>
  <section>
    <page-header title="Agent 接入" sub="把开发部系统接进你自己的 AI 助手（MCP + OAuth 2.1）" />

    <div class="grid">
      <div class="panel">
        <h2 class="panel-title">① 授权你的助手</h2>
        <p class="desc">点击授权后自动完成：客户端注册（DCR）→ GitHub 式授权 → 令牌存储。授权后你的助手可经 MCP 调用系统工具。</p>
        <button class="btn-primary" :disabled="registering" @click="startAuth">
          {{ registering ? '注册中…' : '授权我的助手' }}
        </button>
        <div v-if="authorizedClients.length" class="auth-list">
          <div v-for="c in authorizedClients" :key="c.id" class="auth-item">
            <span class="mono">{{ c.name }}</span>
            <span class="hint">{{ c.scope }}</span>
            <button class="copy-btn danger" @click="revokeAuth">撤销</button>
          </div>
        </div>
        <p class="hint">* 需先登录成员账号；撤销后 agent 令牌立即失效</p>
      </div>

      <div class="panel">
        <h2 class="panel-title">② 复制配置到你的客户端</h2>
        <n-collapse>
          <n-collapse-item title="Claude Desktop" name="claude">
            <pre class="code">{{ configs.claude }}</pre>
            <button class="copy-btn" @click="copy('claude')">复制</button>
          </n-collapse-item>
          <n-collapse-item title="Cursor" name="cursor">
            <pre class="code">{{ configs.cursor }}</pre>
            <button class="copy-btn" @click="copy('cursor')">复制</button>
          </n-collapse-item>
          <n-collapse-item title="Hermes Agent" name="hermes">
            <pre class="code">{{ configs.hermes }}</pre>
            <button class="copy-btn" @click="copy('hermes')">复制</button>
          </n-collapse-item>
        </n-collapse>
      </div>
    </div>

    <div class="panel">
      <h2 class="panel-title">③ 你的助手能做什么（当前角色可见工具）</h2>
      <n-spin v-if="loading" class="spin" />
      <div v-else class="tools">
        <div v-for="t in tools" :key="t.id" class="tool">
          <span class="t-id mono">{{ t.id }}</span>
          <span class="t-desc">{{ t.description }}</span>
          <n-tag v-if="t.requiresApproval" size="tiny" type="warning" :bordered="false">需审批</n-tag>
        </div>
        <p v-if="!tools.length" class="hint">暂无可见工具</p>
      </div>
    </div>

    <div class="panel">
      <h2 class="panel-title">④ 内置助理 bot</h2>
      <p class="desc">在社区帖子/评论中 <b>@dev-assistant</b> 即可唤起：可查公告、招募中的点子、任务进展、社区帖子。</p>
      <p class="hint">示例：「@dev-assistant 最近有什么公告？」</p>
    </div>
  </section>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
}
.panel {
  background: var(--cs-surface-1);
  border: 1px solid var(--cs-hairline);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
}
.panel-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 10px;
}
.desc {
  color: var(--cs-ink-muted);
  font-size: 13px;
  line-height: 1.7;
  margin-bottom: 12px;
}
.hint {
  color: var(--cs-ink-subtle);
  font-size: 12px;
  margin-top: 8px;
}
.btn-primary {
  display: inline-block;
  background: var(--cs-accent);
  color: #fff;
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
}
.code {
  background: var(--cs-canvas);
  border: 1px solid var(--cs-hairline);
  border-radius: 6px;
  padding: 12px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
.copy-btn {
  margin-top: 8px;
  background: transparent;
  border: 1px solid var(--cs-hairline);
  color: var(--cs-ink-muted);
  border-radius: 6px;
  padding: 4px 14px;
  font-size: 12px;
  cursor: pointer;
}
.tools {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.tool {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--cs-hairline-subtle);
  border-radius: 6px;
}
.t-id {
  color: var(--cs-accent);
  font-size: 12px;
  flex-shrink: 0;
}
.t-desc {
  flex: 1;
  color: var(--cs-ink-muted);
  font-size: 12px;
}
.spin {
  display: block;
  margin: 20px auto;
}
</style>
