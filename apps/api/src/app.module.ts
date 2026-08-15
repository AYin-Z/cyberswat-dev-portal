import { Module } from '@nestjs/common'
import { KernelModule } from './core/kernel.module'

/**
 * 应用根模块 — 只做一件事：装配内核。
 * MCP Server 挂载在 main.ts 以 express stack 注入方式实现。
 */
@Module({
  imports: [KernelModule],
})
export class AppModule {}
