# CyberSWAT 开发部子站 — 最终设计定稿（DESIGN v1.0）

> 日期：2026-08-15 · 状态：✅ 设计定稿（三轮评审 + 三轮压力测试，19 项裁决全部落档）
> 范围：dev.cyberswat.cn 迭代 R1-R2 的全部架构决策；愿景见主仓库 docs/VISION.md
> 原则：落地简单，设计严密——所有决策先讨论后实现

## 0. 决策索引（19 项裁决总表）

| # | 议题 | 裁决 | 落点 |
|---|---|---|---|
| 1 | agent 形态 | 双轨：内置 bot（社区嵌入 @ 触发）+ 成员 agent（MCP 接入） | R2 |
| 2 | R1 优先级 | 人力匹配优先（技能资料 → 点子匹配通知） | R1 |
| 3 | agent 数据面 | member 级脱敏（真实姓名/区队永不进 agent 上下文） | R2 |
| 4 | 子站策略 | 严格等 PRD（只维护 dev） | 长期 |
| 5 | 聚合攻击防护 | 双限额：读 30 次/时 + 写 5 次/时（超限进审批）+ 审计聚合视图 | R2 |
| 6 | OAuth scope | 现在就做，权限点级 | R2 |
| 7 | 技能词表 | 两级：分类→技术，匹配用技术级 | R1 |
| 8 | 生命周期 | 冻结用户 → 级联撤销 refresh token；DCR client 保留；bot 归 admin | R2 |
| 9 | scope 粒度 | 权限点级逐项勾选，默认只读勾选/写不勾 | R2 |
| 10 | bot 存储 | core_agents 表（persona/白名单/启用状态） | R2 |
| 11 | AI 署名 | authorViaAgent 字段 + 🤖 AI 代发角标 | R2 |
| 12 | 验证策略 | 三客户端交叉验证（inspector/Claude Desktop/hermes） | R2 |
| 13 | 内容治理 | 删除（作者+部长软删）+ 举报队列 + content.* 事件 | R1 |
| 14 | LLM 成本 | 内置 bot 低成本模型+月配额；成员 agent 自带密钥 | R2 |
| 15 | 匹配隐身 | 资料页「接收匹配邀请」开关（默认开） | R1 |
| 16 | 项目级权限 | 资源级校验（全局权限 或 项目内 LEAD 角色） | R1 |
| 17 | 数据备份 | pg_dump 每日 cron + 30 天滚动，并入 R1-S1 | R1 |
| 18 | 测试基建 | R1 起 vitest+supertest e2e（~30 核心用例） | R1 |
| 19 | 知识预留 | Post.is_answered + 项目 decision_log 留字段坑 | R1 |

## 1. 双轨 agent 架构（#1 #3 #5 #6 #8 #9 #10 #11 #12 #14）

```
内置 bot (bot:dev-assistant)          成员自己的 agent (Claude/Cursor/hermes...)
  社区被 @ 触发                          │
  core_agents 表存 persona              │ OAuth 2.1 + PKCE + RFC 7591 DCR
  只读直接答 / 写走审批                   ▼
  低成本模型 + 月配额              /mcp 端点 (官方 SDK, streamable HTTP)
                                    │
                    ┌───────────────┴───────────────┐
                    │ ToolRegistry（统一管道）          │
                    │  scope 过滤: requiredPermission ∈ token scope
                    │  双限额: 读30/时 写5/时(超限审批)
                    │  审计: agentId + via_agent + 上下文来源
                    │  数据面: member 级脱敏
                    └───────────────────────────────┘
成员 agent LLM 成本 = 成员自带密钥（系统零成本）
```

## 2. 权限模型（#16 #5 #8）

```
全局角色: guest/member/dept-leader/admin（现状，权限点体系）
资源级角色: project_members.role (LEAD/MEMBER) —— service 层双条件校验:
  建任务/验收 = task.assign 全局权限 或 该项目 LEAD
agent 权限 = 其主人权限继承（scope 声明内）; 写操作 requiresApproval 双保险
生命周期: 冻结用户 → 撤销 refresh token → agent 授权自然失效
```

## 3. 人力匹配闭环（#2 #7 #15）

```
两级词表（分类→技术）→ 成员资料选择（词表+自定义兜底）
  → 点子发布 (idea.created) → techStack ∩ skills（技术级交集）
  → 匹配通知（每人 ≤3 条/天，可关闭[#15]）→ 点子详情
匹配只认 techStack（结构化），need 自由文本仅展示
```

## 4. 内容治理（#13 #11）

```
删除: 作者本人 + dept-leader/admin（软删除留审计）
举报: 帖子/评论 → moderation 队列 → 部长处置（删/忽略）
AI 署名: authorViaAgent → 🤖 角标（R2 生效）
事件: content.reported / content.removed
```

## 5. 数据与工程（#17 #18 #19）

```
备份: pg_dump 每日 cron（保留 30 天）→ R1-S1
测试: vitest + supertest + 测试库（独立 schema），核心链路 ~30 用例
知识预留: Post.is_answered（bot 答后标记）+ Project.decisionLog 字段
```

## 6. 迭代范围锁定

### R1（人力匹配 + 工程债）
- R1-P1 个人资料编辑页（两级词表 + 匹配开关）
- R1-P2 点子→成员匹配通知（≤3 条/天）
- R1-P3 通知中心完整 UI
- R1-P4 体验小修（首页聚合/复制降级/空态）
- R1-P5 内容治理基础（删除 + 举报队列）
- R1-P6 项目级权限（LEAD 双条件校验）
- R1-S1 安全必做：凭证更换 + 每日备份
- R1-T1 测试基建（e2e 框架 + 核心用例）

### R2（agent 体系）
- R2-A 内置 bot（core_agents + 社区嵌入 + AI 署名）
- R2-B MCP Server（OAuth 2.1 + DCR + scope 权限点级 + 双限额 + 级联撤销）
- R2-C /agent 接入页（工具清单 + 平台配置片段 + 授权管理）
- R2-D 审批工作台（来源区分 bot/成员 agent/人工）

## 7. 明确不做（边界）

- ❌ 运行时插件加载 / 消息队列 / 微前端（L0 纪律延续）
- ❌ 前台对话型 bot（等 R2 价值验证）
- ❌ OAuth scope 之外的细粒度资源授权（项目级 RBAC 是极限）
- ❌ 内容自动审核（只做人工队列 + bot 辅助初审预留给 R4）
