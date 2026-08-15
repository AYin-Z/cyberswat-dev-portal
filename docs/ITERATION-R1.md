# 迭代 R1 — 成员体验打磨（执行计划）

> 对应 docs/VISION.md 路线图 R1 · 目标："让进来的人留得下"
> 基线：第一版全功能已上线（2026-08-15），认证（邀请制+GitHub OAuth）已闭环

## 0. 迭代目标与范围

**目标**（2026-08-15 评审重排：人力匹配优先）：成员技能资料结构化 → 点子发布自动匹配推荐，
打通"点子→人力"闭环；系统从"demo 级凭证"到"可正式对外"。

**范围**（4 个交付 + 1 个安全必做）：
1. 个人资料编辑页（R1-P1）— **技能标签受控词表 + 自定义兜底，按"给 agent 吃"的结构化标准设计**
2. 点子→成员匹配通知（R1-P2，原"项目经历展示"降级并入）— idea.created 事件 → 技能交集匹配 → 定向通知 top-N
3. 通知中心完整 UI（R1-P3）
4. 前端体验小修（R1-P4）
5. 生产凭证更换（R1-S1，安全必做项）

**验收标准**：
- 成员可编辑年级/技能/签名/外链/头像，保存后成员页即时生效
- 成员主页显示参与的项目（含角色与时间）
- 通知中心：未读红点 + 列表 + 全部已读 + 单条已读 + socket 实时增量
- 生产 JWT_SECRET/DB 密码为强随机值，旧登录态全部失效并重新登录正常

## 1. 任务分解

### R1-P1 个人资料编辑页（核心交付）
```
后端:
- PATCH /api/me (更新 profile: grade/skills/bio/links/avatarUrl) — UsersService.updateProfile
- 校验: skills 数组上限 10, links 上限 5 且 url 格式校验
- 权限: 仅本人（JWT 身份即 owner，无需额外权限点）
- 事件: user.profile.updated（预留：agent 感知成员技能变化 → 点子匹配）
- 工具: user.updateProfile（agent 代成员维护资料需本人确认？—— 评估后定：默认 agentCallable: false）

前端:
- /profile 页面（表单: 年级/技能标签编辑器/签名/外链列表增删/头像 URL）
- 保存 → 乐观更新 + 提示
- 路由注册: 内核能力 (core.profile)，manifest 加 menu
```
数据模型：core_users 已含全部字段（grade/skills/bio/links/avatarUrl/github），**无需迁移** ✅

### R1-P2 点子→成员匹配通知（评审重排核心）
```
数据/词表:
- skills 词表: 受控词表（Web前端/后端/数据库/安全/算法/AI/运维/测试/产品/设计 + 自定义兜底）
- core_skills 表或 core_users.skills 规范化（词表 id 引用）—— 设计时定，倾向独立词表表 + 用户多对多

后端:
- 点子发布时（idea.created 事件）→ 匹配引擎: 点子 techStack ∩ 成员 skills（词表 id 交集）
- 命中 top-N（默认 5）→ 定向通知 "你会的 X 正是点子「Y」缺的"（link 到点子详情）
- 幂等/频率限制: 同一点子每成员只通知一次；发布人/已加入者除外
- 匹配结果记日志（可观测 + 后续给 agent 学）

前端:
- 成员资料页技能选择: 词表联想输入（受控优先）+ 自定义标签
- 点子详情页显示 "已通知 N 位技能匹配的成员"（部长可见）
- 成员主页项目经历（原 P2）降级: 并入 P1 资料页展示，不再单独排期
```

### R1-P3 通知中心完整 UI
```
- 顶部铃铛: 未读红点（socket notification:unread 驱动）
- 下拉面板: 分组（mention/task/announcement/comment/like/idea）+ 时间
- 单条已读（点击）+ 全部已读
- 点通知跳转对应页面（link 字段已备）
- 前端 store: notification store（unread count + list + socket 订阅）
```
后端已全部就绪（/api/notifications + gateway）✅ 纯前端工作

### R1-P4 前端体验小修
- 登录页: GitHub 登录按钮已有；加"注册需邀请"提示优化
- 邀请管理页: 复制链接按钮降级（navigator.clipboard 在 http 下受限 → fallback 选中文本）
- 首页: 换成真实数据聚合（最近公告/招募中点子/我的任务/未读通知）
- 空态文案统一

### R1-S1 生产凭证更换（安全必做）
```
- JWT_SECRET: openssl rand -base64 48 → 更新 ~/.cyberswat-dev-prod.env → 重建 API 容器
- DB 密码: cyberswat → 强随机; 需: 重建 dev-db-prod 卷 或 ALTER USER（数据保留用 ALTER）
  - ALTER USER cyberswat PASSWORD '...' + 更新 env + 重建 API 容器
- 验证: 旧 token 失效（401）、重新登录成功、GitHub OAuth 仍可用
- 注意: OAuth App 的 secret 不动（与 JWT 无关）
```

## 2. 依赖与顺序

```
R1-S1 可与 R1-P1 并行（不同容器配置）
R1-P1 → R1-P2（P2 复用 P1 的 profile 服务）
R1-P3 独立
R1-P4 穿插
```

## 3. 风险

| 风险 | 缓解 |
|---|---|
| clipboard API 在非 https 本地开发受限 | fallback: 选中文本复制（execCommand） |
| links/avatarUrl 是 URL 字段 → XSS/外链风险 | 前端渲染只用 <a href>，校验 http(s) 白名单；序列化脱敏已有 |
| 换 DB 密码时容器编排短暂断连 | 先 ALTER USER 再重建 API 容器（窗口 <30s），或先建新密码用户再切 |
| P1 资料编辑与 agent 联动过度设计 | 本期只发事件，不做 agent 消费（R2 再消费） |

## 4. 完成定义（DoD）

- [ ] 全部 4 个交付上线 dev.cyberswat.cn
- [ ] 生产凭证为强随机值（env 文件 600，不入库）
- [ ] 端到端验证：成员填技能 → 发点子 → 匹配成员收到定向通知 → 点击跳点子详情
- [ ] 技能词表按结构化标准入库（R2 agent 可直接消费）
- [ ] 双仓推送 + AGENTS.md 里程碑更新

## 5. 预估

- P1: 后端 0.5d + 前端 1d
- P2: 0.5d
- P3: 1d
- P4: 0.5d
- S1: 0.5d
- 合计约 4d（可并行压缩至 2-3d）
