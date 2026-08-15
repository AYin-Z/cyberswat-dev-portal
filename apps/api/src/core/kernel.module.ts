import { Module, OnModuleInit } from '@nestjs/common'
import { DbModule } from './db/db.module'
import { PluginsModule } from './plugins/plugins.module'
import { PermissionsModule } from './permissions/permissions.module'
import { PermissionsService } from './permissions/permissions.service'
import { EventsModule } from './events/events.module'
import { ToolsModule } from './tools/tools.module'
import { ToolRegistry, type ToolCallContext } from './tools/tool.registry'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { MeController } from './users/me.controller'
import { InvitesModule } from './invites/invites.module'
import { NotificationsModule } from './notifications/notifications.module'
import { SkillsModule } from './skills/skills.module'
import { ModerationModule } from './moderation/moderation.module'
import { GatewayModule } from './gateway/gateway.module'
import { InviteService } from './invites/invite.service'
import { HealthController } from './health.controller'
// 能力包（插件行）：新增能力包时在此追加 import + imports
import { ExampleModule } from '../capabilities/example/example.module'
import { AnnouncementModule } from '../capabilities/announcement/announcement.module'
import { IdeaModule } from '../capabilities/idea-wall/idea.module'
import { IdeaMatchService } from '../capabilities/idea-wall/idea-match.service'
import { ProjectModule } from '../capabilities/project/project.module'
import { CommunityModule } from '../capabilities/community/community.module'

/**
 * 内核 Kernel — 稳定骨架，不是插件。
 * 提供：插件注册表 / 权限点 / 事件总线 / 工具注册表 / 认证 / 用户 / 邀请 / 数据库
 * 能力包只能依赖这里导出的服务，不能反向依赖业务模块。
 */
@Module({
  imports: [
    DbModule,
    PluginsModule,
    PermissionsModule,
    EventsModule,
    ToolsModule,
    AuthModule,
    UsersModule,
    InvitesModule,
    NotificationsModule,
    SkillsModule,
    ModerationModule,
    GatewayModule,
    // —— 能力包装配区 ——
    ExampleModule,
    AnnouncementModule,
    IdeaModule,
    ProjectModule,
    CommunityModule,
  ],
  controllers: [HealthController, MeController],
  providers: [IdeaMatchService],
  exports: [PluginsModule, PermissionsModule, EventsModule, ToolsModule, AuthModule, UsersModule, InvitesModule, NotificationsModule],
})
export class KernelModule implements OnModuleInit {
  constructor(
    private readonly permissions: PermissionsService,
    private readonly tools: ToolRegistry,
    private readonly invites: InviteService,
  ) {}

  /** 内核自身声明的权限点 + 工具（成员生命周期） */
  onModuleInit() {
    this.permissions.registerMany([
      { id: 'invite.create', description: '创建成员邀请', defaultRoles: ['dept-leader', 'admin'] },
      { id: 'invite.list', description: '查看/撤销邀请', defaultRoles: ['dept-leader', 'admin'] },
      { id: 'notification.view', description: '查看通知', defaultRoles: ['member', 'dept-leader', 'admin'] },
    ])

    // agent 开邀请 = 拉人进系统，危险操作 → 需部长审批
    this.tools.register(
      {
        id: 'invite.create',
        description: '创建成员邀请链接（拉新人进系统，需部长审批）',
        params: {
          role: { type: 'string', description: '授予角色: MEMBER/DEPT_LEADER', enum: ['MEMBER', 'DEPT_LEADER'] },
          expiresInDays: { type: 'number', description: '有效期天数，默认 7' },
          maxUses: { type: 'number', description: '可用名额，默认 1' },
        },
        requiredPermission: 'invite.create',
        requiresApproval: true,
      },
      async (params: unknown, ctx: ToolCallContext) => {
        const p = params as { role?: 'MEMBER' | 'DEPT_LEADER'; expiresInDays?: number; maxUses?: number }
        const res = await this.invites.create({
          createdBy: ctx.caller,
          role: p.role ?? 'MEMBER',
          expiresInDays: p.expiresInDays,
          maxUses: p.maxUses,
        })
        return { inviteId: res.invite.id, link: res.link, expiresAt: res.invite.expiresAt, maxUses: res.invite.maxUses }
      },
    )
  }
}

