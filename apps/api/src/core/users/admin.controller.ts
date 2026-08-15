import { Body, Controller, ForbiddenException, Param, Post } from '@nestjs/common'
import { UsersService } from './users.service'
import { PrismaService } from '../db/prisma.service'
import { Authorize, CurrentUser, type AuthUser } from '../permissions/permission.decorator'

/**
 * 🔴-6：冻结用户（admin/dept-leader）— 立即停用 + 级联撤销：
 *  - core_users.active=false（登录即拒）
 *  - 主会话 refresh token 全撤销
 *  - OAuth access/refresh 全撤销（revokeUserTokens）
 */
@Controller('admin/users')
export class AdminUsersController {
  constructor(
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  @Authorize('user.freeze')
  @Post(':id/freeze')
  async freeze(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    if (actor.id === id) throw new ForbiddenException('不能冻结自己')
    await this.users.freeze(id)
    // 级联撤销主会话 refresh
    await this.prisma.coreRefreshToken.updateMany({
      where: { userId: id, revoked: false },
      data: { revoked: true },
    })
    // 级联撤销 OAuth tokens
    await this.prisma.coreOauthToken.updateMany({
      where: { userId: id, revoked: false },
      data: { revoked: true },
    })
    return { ok: true, message: '用户已冻结，会话与 agent 授权已全部撤销' }
  }
}
