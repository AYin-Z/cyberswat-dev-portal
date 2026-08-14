# cyberswat-dev-portal — CyberSWAT 开发部子站系统

## 项目身份
CyberSWAT 网络特警队开发部子站（dev.cyberswat.cn），插件化架构（借鉴 DSH/Cordis 设计哲学）。
双仓库：个人 AYin-Z/cyberswat-dev-portal（主源）+ 组织 PPSUC-CyberSWAT/cyberswat-dev-portal（同步），
`git push origin main` 双推。仓库级 http.proxy=127.0.0.1:7890。

## 关键决策（2026-08-12）
- 技术栈：NestJS 11 + Prisma + PostgreSQL 16 + socket.io + JWT + GitHub OAuth；前端 Vue3+Vite+TS+Pinia（与主站同栈）
- 插件化：内核（core/）+ 能力包（capabilities/）= 插件；五个扩展点：事件总线/工具注册表/UI贡献/权限点/数据模型
- 部门 agent 路线：agent = 特殊插件（persona + tools 白名单 + 事件订阅 + bot: 身份）；写操作一律审批 + 审计
- 纪律：L0 代码级插件，禁运行时加载/消息队列/微前端；数据模型用命名空间规范（core_ 前缀）而非合并工具
- 设计文档：docs/plugin-architecture-eval.md（调研与评估）、docs/PRD.md、docs/tech-stack-analysis.md

## 环境
- Node v24.11.1 在 ~/.local/bin/node（系统 /usr/bin/node 是 v22，pnpm 会 SQLite 故障）
- pnpm 11.17.0（corepack），PATH 需含 ~/.local/bin

## 开发命令
- pnpm dev:api → 内核 127.0.0.1:8093/api
- pnpm dev:web → 前端 127.0.0.1:5175（proxy /api → 8093）
- 能力包模板：apps/api/src/capabilities/example/ + apps/web/src/capabilities/example/

## 里程碑
- [x] M0: 仓库 + monorepo 骨架 + 内核（插件注册表/权限点/事件总线/工具注册表/认证占位）
- [ ] M1: 认证（Prisma 落库 + bcrypt + GitHub OAuth + 邀请激活）+ 公告能力包
- [ ] M2: 点子墙 + 成员主页（Vidar 卡片）
- [ ] M3: 任务分派 + 点子孵化
- [ ] M4: 轻量社区（socket.io 通知）
- [ ] M5: 上线 dev.cyberswat.cn（容器 + ingress + CNAME）
