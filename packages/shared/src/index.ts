/**
 * @cyberswat/shared — 插件化架构契约层
 *
 * 内核（apps/api）与能力包（plugins）之间的共享类型。
 * 设计哲学借鉴 DSH/Cordis：内核极简，能力即插件，一切通过声明组合。
 *
 * 分层约定：
 *  - core/*    内核领域类型（用户/角色/权限/事件/工具/插件清单）
 *  - domain/*  业务领域类型（公告/点子/任务/社区 —— 由能力包扩展）
 */

// ============ 插件清单 Plugin Manifest ============

/**
 * 插件清单 — 每个能力包（NestJS Module）自带一份声明。
 * 对应 DSH 的 cordis 插件行：name + 配置 schema + 依赖注入 + 能力声明。
 */
export interface PluginManifest {
  /** 插件唯一 id，命名空间约定：<domain>.<name>，如 dev.idea-wall */
  id: string
  /** 语义化版本 */
  version: string
  /** 依赖的其他插件/内核服务 id，对应 cordis 的 inject */
  deps?: string[]
  /** 本插件声明的权限点，如 ['idea.view', 'idea.post', 'idea.promote'] */
  permissions?: PermissionPoint[]
  /** 注册给 ToolRegistry 的工具 id 列表 */
  tools?: string[]
  /** 订阅的内核事件（domain.action 格式） */
  events?: string[]
  /** UI 贡献声明（前端 manifest 静态合并，禁止运行时加载） */
  ui?: {
    routes?: string[]
    menu?: string[]
    slots?: string[]
  }
  /** 数据模型命名空间，如 'idea_wall'（表前缀约定） */
  dbNamespace?: string
}

// ============ 权限 Permission ============

/** 角色 — RBAC 基础层（角色是权限点的集合） */
export type Role = 'guest' | 'member' | 'dept-leader' | 'admin'

/** 权限点 — 细粒度权限声明，格式 <domain>.<action> */
export interface PermissionPoint {
  /** 权限 id，如 'idea.promote' */
  id: string
  /** 人类可读描述，用于管理界面 */
  description: string
  /** 默认授予的角色 */
  defaultRoles: Role[]
}

// ============ 工具 Tool ============

/** 工具入参 JSON Schema（子集：object/string/number/boolean/array/enum） */
export type ToolParamSchema =
  | { type: 'string'; description?: string; enum?: string[] }
  | { type: 'number'; description?: string }
  | { type: 'boolean'; description?: string }
  | {
      type: 'object'
      description?: string
      properties?: Record<string, ToolParamSchema>
      required?: string[]
    }
  | { type: 'array'; description?: string; items?: ToolParamSchema }

/**
 * 工具定义 — 能力包注册给 ToolRegistry 的单元。
 * 对应 DSH dsh-tools 的 scope/approval/policy 语义：
 *  - requiredPermission → scope（谁可见）
 *  - requiresApproval    → approval（危险操作需人工确认）
 *  - audit               → policy（审计铁律）
 */
export interface ToolDefinition {
  /** 工具 id，命名空间约定：<domain>.<action>，如 'idea.search' */
  id: string
  /** 给 LLM 看的描述（决定 agent 何时调用它） */
  description: string
  /** 入参 JSON Schema（agent 按此生成参数） */
  params: Record<string, ToolParamSchema>
  /** 可见性：需要的最小权限点，无则不暴露给该 agent */
  requiredPermission?: string
  /** 危险操作需人工审批（如创建公告/指派任务），agent 调用进入 pending 队列 */
  requiresApproval?: boolean
  /** 是否记录审计（默认 true — 公安院校场景审计是铁律） */
  audit?: boolean
  /** 是否允许 agent 调用（默认 true；false = 仅人工/HTTP 调用） */
  agentCallable?: boolean
}

/** 工具调用记录 — 审计表结构 */
export interface ToolCallRecord {
  id: string
  toolId: string
  /** 调用者：用户 id 或 bot:<agent-id> */
  caller: string
  /** agent 调用时记录 agent id；人工调用为空 */
  agentId?: string
  params: unknown
  result?: unknown
  status: 'ok' | 'error' | 'pending' | 'rejected'
  /** requiresApproval 时的审批人 */
  approvedBy?: string
  createdAt: string
}

// ============ 事件 Event ============

/** 内核事件载荷 — 对应 DSH 的 ctx.emit；命名 <domain>.<action> */
export type CoreEventMap = {
  'user.created': { userId: string }
  'user.role.changed': { userId: string; role: Role }
  'permission.granted': { userId: string; permission: string }
  /** 工具审批事件（agent 调用危险工具时触发） */
  'tool.approval.requested': { record: ToolCallRecord }
  'tool.approval.resolved': { recordId: string; approved: boolean }
  'announcement.published': { announcementId: string; title: string }
  'task.status.changed': { taskId: string; from: string; to: string }
  'idea.created': { ideaId: string }
  'idea.promoted': { ideaId: string; projectId: string }
  'post.mentioned': { postId: string; mentionedUserIds: string[] }
  'bot.mention': { content: string; postId: string; byUserId: string; commentId?: string }
}

// ============ 用户与身份 ============

/** 对外可见的用户资料（脱敏后）— 姓名/区队/联系方式永不进此结构 */
export interface PublicUserProfile {
  id: string
  nickname: string
  /** 年级，如 '2026' */
  grade: string
  /** 方向/技能标签 */
  skills: string[]
  /** 一句话签名 */
  bio?: string
  /** 外链区：GitHub（OAuth 自动带出）+ Blog 自定义 + 其他 */
  links: { label: string; url: string }[]
  avatarUrl?: string
  /** GitHub 用户名（OAuth 绑定后同步） */
  github?: string
}

/** 内部用户资料（仅 dept-leader/admin 可见） */
export interface InternalUserProfile extends PublicUserProfile {
  realName: string
  /** 区队/学号 — 公安院校隐私红线，仅内部 */
  teamInfo: string
  email: string
  role: Role
  active: boolean
  /** 接收项目匹配邀请开关（P2 匹配池） */
  allowMatch: boolean
  createdAt: string
}

// ============ 通用 ============

export interface ApiResponse<T> {
  data: T
  meta?: {
    page?: number
    pageSize?: number
    total?: number
  }
}

export interface ApiError {
  code: string
  message: string
  /** 字段级错误：{ field: message } */
  fields?: Record<string, string>
}
