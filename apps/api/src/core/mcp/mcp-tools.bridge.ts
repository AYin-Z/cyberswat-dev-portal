import { Injectable, Logger } from '@nestjs/common'
import { Server as McpServer } from '../../../node_modules/@modelcontextprotocol/sdk/dist/cjs/server/index.js'
import { ListToolsRequestSchema, CallToolRequestSchema } from '../../../node_modules/@modelcontextprotocol/sdk/dist/cjs/types.js'
import { ToolRegistry, type ToolCallContext } from '../tools/tool.registry'
import { AsyncLocalStorage } from 'node:async_hooks'

/** 双限额（DESIGN #5）：读 30 次/时，写 5 次/时（超限拒绝） */
const READ_LIMIT = 30
const WRITE_LIMIT = 5
const WINDOW_MS = 3600_000

/** 写类工具判定 */
const isWriteTool = (id: string, requiresApproval?: boolean) =>
  requiresApproval === true || /(create|publish|assign|invite|join|submit|review|confirm|revoke|update|delete)/.test(id)

export interface McpAuth {
  userId: string
  scopes: string[]
  clientId: string
}

export const mcpAls = new AsyncLocalStorage<McpAuth>()

export const McpContext = {
  get: (): McpAuth | undefined => mcpAls.getStore(),
}

/**
 * MCP Server（R2-B）— ToolRegistry 全量自动暴露 + scope 过滤 + 双限额。
 * tools/list：scope 可见性（requiredPermission ∈ token scopes）过滤。
 * tools/call：权限点校验 → 双限额 → ToolRegistry（审批/审计沿用）→ agentId=clientId。
 */
@Injectable()
export class McpToolsBridge {
  private readonly logger = new Logger(McpToolsBridge.name)
  private server: McpServer | null = null

  /** 限额计数：key = userId:r|w，value = 时间戳数组 */
  private readonly rateMap = new Map<string, number[]>()

  constructor(private readonly tools: ToolRegistry) {}

  /** 每个 MCP 会话一个 Server 实例（SDK 限制：单实例只能连一个 transport） */
  createServer(): McpServer {
    const server = new McpServer(
      { name: 'cyberswat-dev-portal', version: '0.2.0' },
      { capabilities: { tools: {} } },
    )
    this.server = server

    server.setRequestHandler(ListToolsRequestSchema, async () => {
      const auth = McpContext.get()
      if (!auth) return { tools: [] }
      const defs = this.tools.listAll()
      const visible = defs.filter((d) => !d.requiredPermission || auth.scopes.includes(d.requiredPermission))
      return {
        tools: visible.map((d) => ({
          name: d.id.replace(/[^a-zA-Z0-9_-]/g, '_'),
          description: `${d.description}${d.requiresApproval ? '（需要审批）' : ''}`,
          inputSchema: {
            type: 'object',
            properties: Object.fromEntries(Object.entries(d.params).map(([k, v]) => [k, v as Record<string, unknown>])),
          },
        })),
      }
    })

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const auth = McpContext.get()
      if (!auth) throw new Error('未授权')
      const rawName = request.params.name
      // 反查原始工具 id（name 做了转义）
      const def = this.tools.listAll().find((d) => d.id.replace(/[^a-zA-Z0-9_-]/g, '_') === rawName)
      if (!def) throw new Error(`工具不存在: ${rawName}`)

      // scope 校验（权限点级）
      if (def.requiredPermission && !auth.scopes.includes(def.requiredPermission)) {
        throw new Error(`缺少权限点 ${def.requiredPermission}（当前 scope: ${auth.scopes.join(',') || '无'}）`)
      }

      // 双限额
      const write = isWriteTool(def.id, def.requiresApproval)
      this.checkRate(auth.userId, write)

      const ctx: ToolCallContext = { caller: auth.userId, role: 'member', agentId: auth.clientId }
      const result = await this.tools.call(def.id, request.params.arguments ?? {}, ctx, { skipRoleCheck: true })
      return {
        content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }],
        isError: false,
      }
    })

    this.logger.log(`[mcp] 工具面构建完成（${this.tools.listFor('member').length} 工具可暴露）`)
    return server
  }

  private checkRate(userId: string, write: boolean) {
    const now = Date.now()
    const key = `${userId}:${write ? 'w' : 'r'}`
    const arr = (this.rateMap.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
    const limit = write ? WRITE_LIMIT : READ_LIMIT
    if (arr.length >= limit) {
      throw new Error(
        write ? '写操作频率超限（5 次/时），请稍后再试或联系部长' : '读取频率超限（30 次/时），请稍后再试',
      )
    }
    arr.push(now)
    this.rateMap.set(key, arr)
  }
}
