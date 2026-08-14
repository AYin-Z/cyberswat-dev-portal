import { ExecutionContext, Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Reflector } from '@nestjs/core'
import { PUBLIC_KEY } from '../permissions/permission.decorator'

/**
 * 全局 JWT 认证守卫 — 第一道闸。
 * 公开路由（@Public()）跳过认证；其余路由注入 req.user（由 JwtStrategy validate 填充）。
 * 执行顺序：本守卫（认证）→ PermissionGuard（权限），见 permissions.module 注册顺序。
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super()
  }

  canActivate(ctx: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ])
    if (isPublic) return true
    return super.canActivate(ctx)
  }
}
