import { Global, Injectable, Logger, Module, OnApplicationBootstrap } from '@nestjs/common'
import express, { type Express, type Request, type Response } from 'express'
import cookieParser from 'cookie-parser'
import { StreamableHTTPServerTransport } from '../../../node_modules/@modelcontextprotocol/sdk/dist/cjs/server/streamableHttp.js'
import { mcpAuthRouter } from '../../../node_modules/@modelcontextprotocol/sdk/dist/cjs/server/auth/router.js'
import { requireBearerAuth } from '../../../node_modules/@modelcontextprotocol/sdk/dist/cjs/server/auth/middleware/bearerAuth.js'
import { randomUUID } from 'node:crypto'
import { OAuthClientsStore } from '../oauth/oauth-clients.store'
import { McpAppProvider } from './mcp-app.provider'
import { CyberswatOAuthProvider } from '../oauth/oauth-server.provider'
import { McpToolsBridge, mcpAls } from './mcp-tools.bridge'

/**
 * MCP Server 装配（R2-B）— express app：
 *   /mcp        Streamable HTTP（Bearer 认证 → AsyncLocalStorage 上下文）
 *   /oauth/*    OAuth 2.1（DCR/authorize/token/revoke/metadata，SDK mcpAuthRouter）
 */
@Global()
@Module({
  providers: [OAuthClientsStore, CyberswatOAuthProvider, McpToolsBridge, McpAppProvider],
  exports: [OAuthClientsStore, CyberswatOAuthProvider, McpToolsBridge, McpAppProvider],
})
export class McpModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(McpModule.name)
  private readonly sessions = new Map<string, StreamableHTTPServerTransport>()
  private static readonly MAX_SESSIONS = 200 // 🟡-1：会话上限防内存膨胀
  private mcpApp: Express | null = null

  constructor(
    private readonly bridge: McpToolsBridge,
    private readonly provider: CyberswatOAuthProvider,
    private readonly appProvider: McpAppProvider,
  ) {}

  /** 所有能力包注册工具后构建 MCP server 与路由 */
  onApplicationBootstrap() {
    const app: Express = express()
    app.use(express.json())
    app.use(cookieParser())

    const publicUrl = process.env.PUBLIC_API_URL ?? 'http://127.0.0.1:8093'
    const base = new URL(publicUrl.endsWith('/') ? publicUrl : `${publicUrl}/`)

    // OAuth 2.1 路由（SDK 要求挂根：/authorize /token /register /revoke + metadata）
    app.use(
      mcpAuthRouter({
        provider: this.provider,
        issuerUrl: base,
        baseUrl: base,
        scopesSupported: [],
        serviceDocumentationUrl: new URL('agent', base),
        resourceName: 'CyberSWAT 开发部子站',
      }),
    )

    // MCP Streamable HTTP（Bearer 认证）
    app.use(
      '/mcp',
      requireBearerAuth({ verifier: this.provider }),
      (req: Request, _res: Response, next: () => void) => {
        const auth = (req as Request & { auth?: { scopes?: string[]; clientId?: string; extra?: Record<string, unknown> } }).auth
        if (!auth) {
          console.log('[mcp] wrapper: req.auth 为空')
          next()
          return
        }
        mcpAls.run(
          {
            userId: (auth.extra?.userId as string | undefined) ?? '',
            scopes: (auth.scopes as string[] | undefined) ?? [],
            clientId: (auth.clientId as string | undefined) ?? '',
          },
          () => next(),
        )
      },
    )
    app.post('/mcp', async (req: Request, res: Response) => {
      try {
      const sessionId = (req.headers['mcp-session-id'] as string) ?? randomUUID()
      let transport = this.sessions.get(sessionId)
      if (this.sessions.size >= McpModule.MAX_SESSIONS) {
        res.status(429).json({ error: 'too_many_sessions', error_description: '会话数已达上限，请稍后再试' })
        return
      }
      if (!transport) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => sessionId,
          enableJsonResponse: true,
        })
        this.sessions.set(sessionId, transport)
        transport.onclose = () => this.sessions.delete(sessionId)
        // 每会话独立 Server 实例（SDK 限制）
        const server = this.bridge.createServer()
        await server.connect(transport)
        this.logger.log(`[mcp] 新会话 ${sessionId.slice(0, 8)}`)
      }
      await transport.handleRequest(req, res, req.body)
      } catch (e) {
        this.logger.error(`[mcp] 处理失败: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`)
        if (!res.headersSent) res.status(500).json({ error: 'server_error' })
      }
    })
    app.get('/mcp', async (req: Request, res: Response) => {
      const sessionId = req.query.sessionId as string
      const transport = this.sessions.get(sessionId)
      if (!transport) {
        res.status(404).json({ error: 'session not found' })
        return
      }
      await transport.handleRequest(req, res)
    })

    this.mcpApp = app
    this.appProvider.setApp(app)
    // 独立端口监听（nginx 路径分流 /mcp /oauth → 8094）
    const mcpPort = Number(process.env.MCP_PORT ?? 8094)
    app.listen(mcpPort, process.env.MCP_HOST ?? '0.0.0.0')
    this.logger.log(`[mcp] MCP Server 就绪: :${mcpPort}/mcp + :${mcpPort}/oauth/*`)
  }

  /** main.ts 挂载用 */
  getApp(): Express {
    if (!this.mcpApp) throw new Error('MCP app 未构建（onApplicationBootstrap 后可用）')
    return this.mcpApp
  }
}
