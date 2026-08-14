import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'
import { PermissionsService } from './permissions.service'
import { PERMISSION_KEY, PUBLIC_KEY, ROLES_KEY, type AuthUser } from './permission.decorator'
import type { Role } from '@cyberswat/shared'

/**
 * 权限守卫 — 检查请求者角色/权限点。
 * 应用在能力包 Controller 上（配合 Authorize/RequirePermission 装饰器）。
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionsService,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>()
    const user = req.user

    // 公开路由放行（登录/注册/健康检查）
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ])
    if (isPublic) return true

    // 未登录 → 403 而非 401（401 由 JwtStrategy 管；这里统一走权限语义）
    if (!user) throw new UnauthorizedException('未登录')

    const requiredPermission = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ])
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ])

    if (requiredRoles?.length && !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(`需要角色: ${requiredRoles.join('/')}`)
    }
    if (requiredPermission && !this.permissions.has(user.role, requiredPermission)) {
      throw new ForbiddenException(`缺少权限点: ${requiredPermission}`)
    }
    return true
  }
}
