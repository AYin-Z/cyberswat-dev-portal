import { Injectable, Logger } from '@nestjs/common'
import type { PermissionPoint, Role } from '@cyberswat/shared'

/**
 * 权限点服务 — RBAC 角色 + 细粒度权限点。
 * 能力包注册权限点；Guard 校验请求者是否持有。
 *
 * L0：角色→权限映射在内存（默认按 PermissionPoint.defaultRoles 计算）。
 * L1：映射落库（permission 表，管理员可调整），接口不变。
 */
@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name)
  private readonly points = new Map<string, PermissionPoint>()
  /** 角色 → 权限点集合（L0 内存态；由 defaultRoles 汇总） */
  private readonly roleMap = new Map<Role, Set<string>>()

  register(point: PermissionPoint): void {
    if (this.points.has(point.id)) {
      this.logger.warn(`[perm] ${point.id} 重复注册，忽略`)
      return
    }
    this.points.set(point.id, point)
    for (const role of point.defaultRoles) {
      const set = this.roleMap.get(role) ?? new Set<string>()
      set.add(point.id)
      this.roleMap.set(role, set)
    }
    this.logger.log(`[perm] ${point.id} (${point.defaultRoles.join('/')})`)
  }

  /** 批量注册（能力包初始化时调用） */
  registerMany(points: PermissionPoint[]): void {
    points.forEach((p) => this.register(p))
  }

  /** 用户（按角色）是否持有某权限点 */
  has(role: Role, permission: string): boolean {
    return this.roleMap.get(role)?.has(permission) ?? false
  }

  /** 列出全部权限点 */
  list(): PermissionPoint[] {
    return [...this.points.values()]
  }
}
