import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { createHash, randomBytes } from 'node:crypto'
import { CoreRole } from '@prisma/client'
import { PrismaService } from '../db/prisma.service'

export interface InviteView {
  id: string
  role: CoreRole
  expiresAt: string
  maxUses: number
  usedCount: number
  createdBy: string
  revoked: boolean
  createdAt: string
}

/**
 * 邀请服务 — 成员生命周期入口（PRD 构思 #1：邀请制，GitHub 无法证明网特身份）。
 *
 * 设计：
 *  - 令牌 = 24 字节 base64url 随机串，链接形态 /register?invite=<token>
 *  - DB 只存 sha256 哈希 — 即使库泄露也不能伪造邀请
 *  - 有效期 + 名额双限制，支持招新批量化（maxUses）
 *  - 只有 dept-leader/admin 可开邀请（invite.create 权限点）
 */
@Injectable()
export class InviteService {
  private readonly logger = new Logger(InviteService.name)

  constructor(private readonly prisma: PrismaService) {}

  /** 生成邀请，返回明文令牌（仅此一次可见）与链接 */
  async create(input: {
    createdBy: string
    role?: CoreRole
    expiresInDays?: number
    maxUses?: number
  }): Promise<{ token: string; link: string; invite: InviteView }> {
    const token = randomBytes(24).toString('base64url')
    const expiresAt = new Date(Date.now() + (input.expiresInDays ?? 7) * 24 * 3600 * 1000)
    const row = await this.prisma.coreInvite.create({
      data: {
        tokenHash: this.hash(token),
        role: input.role ?? 'MEMBER',
        expiresAt,
        maxUses: input.maxUses ?? 1,
        createdBy: input.createdBy,
      },
    })
    const frontendOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5175'
    this.logger.log(`[invite] 创建邀请 (role=${row.role}, expires=${expiresAt.toISOString()}, maxUses=${row.maxUses}) by ${input.createdBy}`)
    return { token, link: `${frontendOrigin}/register?invite=${token}`, invite: this.toView(row) }
  }

  /** 校验令牌：存在 / 未撤销 / 未过期 / 未超限 */
  async validate(token: string): Promise<{ id: string; role: CoreRole }> {
    const row = await this.prisma.coreInvite.findUnique({ where: { tokenHash: this.hash(token) } })
    if (!row) throw new BadRequestException('邀请令牌无效')
    if (row.revoked) throw new BadRequestException('邀请已被撤销')
    if (row.expiresAt < new Date()) throw new BadRequestException('邀请已过期')
    if (row.usedCount >= row.maxUses) throw new BadRequestException('邀请名额已用完')
    return { id: row.id, role: row.role }
  }

  /** 消费名额（注册成功后调用，原子递增） */
  async consume(token: string): Promise<void> {
    const row = await this.prisma.coreInvite.findUnique({ where: { tokenHash: this.hash(token) } })
    if (!row) return
    await this.prisma.coreInvite.update({
      where: { id: row.id },
      data: { usedCount: { increment: 1 } },
    })
  }

  /** 列表（不含明文令牌） */
  async list(): Promise<InviteView[]> {
    const rows = await this.prisma.coreInvite.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
    return rows.map((r) => this.toView(r))
  }

  /** 撤销 */
  async revoke(id: string): Promise<InviteView> {
    const row = await this.prisma.coreInvite.findUnique({ where: { id } })
    if (!row) throw new NotFoundException('邀请不存在')
    if (row.revoked) throw new BadRequestException('邀请已撤销')
    const updated = await this.prisma.coreInvite.update({ where: { id }, data: { revoked: true } })
    this.logger.log(`[invite] 撤销 ${id}`)
    return this.toView(updated)
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }

  private toView(r: {
    id: string
    role: CoreRole
    expiresAt: Date
    maxUses: number
    usedCount: number
    createdBy: string
    revoked: boolean
    createdAt: Date
  }): InviteView {
    return {
      id: r.id,
      role: r.role,
      expiresAt: r.expiresAt.toISOString(),
      maxUses: r.maxUses,
      usedCount: r.usedCount,
      createdBy: r.createdBy,
      revoked: r.revoked,
      createdAt: r.createdAt.toISOString(),
    }
  }
}
