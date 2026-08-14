import { Global, Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { PermissionsService } from './permissions.service'
import { PermissionGuard } from './permission.guard'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

/**
 * 全局守卫装配 — 顺序即安全语义：
 *   1. JwtAuthGuard    认证（注入 req.user，@Public() 放行）
 *   2. PermissionGuard 权限（角色/权限点校验）
 */
@Global()
@Module({
  providers: [
    PermissionsService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
  exports: [PermissionsService],
})
export class PermissionsModule {}
