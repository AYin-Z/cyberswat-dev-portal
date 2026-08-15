<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '../../stores/auth'
import PageHeader from '../../components/PageHeader.vue'
import { NTag, NSpin, NCollapse, NCollapseItem, useMessage } from 'naive-ui'

const auth = useAuthStore()
const message = useMessage()
const tools = ref<{ id: string; description: string; requiresApproval: boolean }[]>([])
const loading = ref(true)
const copied = ref('')

async function load() {
  const res = await fetch('/api/tools', { headers: { Authorization: `Bearer ${auth.token}` } })
  if (res.ok) {
    tools.value = (await res.json()) as { id: string; description: string; requiresApproval: boolean }[]
  }
  loading.value = false
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

onMounted(load)
</script>

<template>
  <section>
    <page-header title="Agent 接入" sub="把开发部系统接进你自己的 AI 助手（MCP + OAuth 2.1）" />

    <div class="grid">
      <div class="panel">
        <h2 class="panel-title">① 授权你的助手</h2>
        <p class="desc">点击下方按钮授权后，你的助手获得一个访问令牌（按能力包勾选权限）。</p>
        <a :href="`${mcpUrl}/oauth/authorize?client_id=manual&response_type=code&redirect_uri=${encodeURIComponent(origin + '/agent')}`" class="btn-primary">前往授权</a>
        <p class="hint">* 授权需先登录成员账号；令牌可在右上角退出登录后重新授权撤销</p>
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
