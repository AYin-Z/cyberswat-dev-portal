import { Injectable } from '@nestjs/common'
import type { Express } from 'express'

/** MCP express app 持有者（McpLazyMiddleware 注入用） */
@Injectable()
export class McpAppProvider {
  private app: Express | null = null
  setApp(app: Express) {
    this.app = app
  }
  getApp(): Express {
    if (!this.app) throw new Error('MCP app 未构建（onApplicationBootstrap 后可用）')
    return this.app
  }
}
