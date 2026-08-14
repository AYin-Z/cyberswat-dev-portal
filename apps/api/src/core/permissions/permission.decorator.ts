import { SetMetadata, applyDecorators, createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'
import type { Role } from '@cyberswat/shared'

/** 声明接口所需权限点：@RequirePermission('idea.promote') */
export const PERMISSION_KEY = 'cyberswat:permission'
export const RequirePermission = (permission: string) =>
  SetMetadata(PERMISSION_KEY, permission)

/** 公开路由（登录/注册/健康检查等），跳过权限守卫 */
export const PUBLIC_KEY = 'cyberswat:public'
export const Public = () => SetMetadata(PUBLIC_KEY, true)

/** 声明接口可用角色（与 RequirePermission 二选一或并用） */
export const ROLES_KEY = 'cyberswat:roles'
export const RequireRoles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles)

/** 从请求取当前用户（由 JwtStrategy 注入 request.user） */
export interface AuthUser {
  id: string
  role: Role
  nickname: string
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>()
    return req.user!
  },
)

/** 组合装饰器：权限点 + 角色，方便能力包一行声明 */
export const Authorize = (permission?: string, roles?: Role[]) =>
  applyDecorators(
    ...(permission ? [RequirePermission(permission)] : []),
    ...(roles?.length ? [RequireRoles(...roles)] : []),
  )
