import { Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type { CoreEventMap } from '@cyberswat/shared'

/**
 * 事件总线 — 内核级通信，能力包之间不直接依赖。
 * 对应 DSH 的 ctx.emit/ctx.on：领域事件解耦发布与消费。
 *
 * 事件命名：<domain>.<action>（announcement.published / task.status.changed ...）
 * L0 进程内（EventEmitter2）；未来多实例可换消息队列，接口不变。
 */
@Injectable()
export class EventBus {
  constructor(private readonly emitter: EventEmitter2) {}

  /** 发布事件（异步，不阻塞调用方） */
  emit<K extends keyof CoreEventMap>(event: K, payload: CoreEventMap[K]): void {
    this.emitter.emit(event, payload)
  }

  /** 订阅事件（能力包/agent 使用） */
  on<K extends keyof CoreEventMap>(
    event: K,
    handler: (payload: CoreEventMap[K]) => void,
  ): void {
    this.emitter.on(event, handler)
  }

  /** 发布原始事件（能力包自定义领域事件，扩展 CoreEventMap 之外） */
  emitRaw(event: string, payload: unknown): void {
    this.emitter.emit(event, payload)
  }

  /** 订阅原始事件 */
  onRaw(event: string, handler: (payload: unknown) => void): void {
    this.emitter.on(event, handler)
  }
}
