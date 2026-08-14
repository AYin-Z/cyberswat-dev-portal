import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

/** Prisma 服务 — 全局唯一客户端（内核与能力包共用） */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect()
    console.log('[prisma] connected')
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
