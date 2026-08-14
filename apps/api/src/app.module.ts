import { Module } from '@nestjs/common'
import { KernelModule } from './core/kernel.module'

/**
 * 应用根模块 — 只做一件事：装配内核。
 * 能力包（公告/点子墙/社区/任务...）以插件形式通过 PluginRegistry 注册，
 * 不在本文件里手写 import 列表（对应 DSH "空内核 + 插件行"哲学）。
 */
@Module({
  imports: [KernelModule],
})
export class AppModule {}
