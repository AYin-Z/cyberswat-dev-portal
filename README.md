# cyberswat-dev-portal

CyberSWAT 网络特警队 **开发部子站系统** — **https://dev.cyberswat.cn**（2026-08-15 上线）

插件化架构 monorepo（借鉴 DSH/Cordis 设计哲学）：公告发布 / 信息流转 / 轻量社区 / 点子墙 / 项目任务，未来扩展部门 agent。

## 功能全景（第一版全功能 ✅）

| 模块 | 能力 |
|---|---|
| 认证 | 邀请制注册（令牌哈希/名额/撤销）· 邮箱密码 bcrypt · JWT + refresh 轮换 · GitHub OAuth 二级（代码就绪） |
| 公告 | 发布 / **已读追踪**（谁看了没看）/ 重要公告确认 / 部长名单统计 |
| 点子墙 | 点子发布（缺人力/技术招募）/ 申请加入（自动转孵化）/ 部长转正为项目 |
| 项目任务 | OSPP 项目卡片（难度/技术栈/负责人/仓库）· **任务闭环**：指派→接单→提交→验收 |
| 社区 | 4 板块（灌水/求助/分享/招人）· 评论 · 点赞 · **@提及→通知** |
| 实时通知 | socket.io 网关（JWT 认证）· 公告全员广播 · 任务定向推送 · 通知铃铛 |
| 成员主页 | Vidar 卡片（年级分组/技能/签名/外链）· **API 层脱敏**（姓名/区队/邮箱不外泄） |
| agent 扩展 | 工具注册表（8 工具，3 个需审批：invite.create / announcement.publish / task.create）+ 全量审计 |

## 技术栈

- **API**: NestJS 11 + Prisma + PostgreSQL 16 + JWT + socket.io + bcrypt
- **Web**: Vue3 + Vite + TS + Pinia（与主站同栈）
- **共享契约**: packages/shared（PluginManifest / PermissionPoint / ToolDefinition / CoreEventMap）

## 架构（插件化）

```
apps/web      Vue3 前端（manifest 驱动 UI 贡献点：菜单/路由自动合并）
apps/api      NestJS 内核 + 能力包
  core/          内核（稳定骨架，不是插件）
                 plugins/     插件注册表（manifest 收集器）
                 permissions/ 权限点 + Guard（JWT→RBAC→细粒度权限）
                 events/      事件总线（EventEmitter2，领域事件解耦）
                 tools/       工具注册表（scope/approval/audit 三件套）
                 auth/        认证（邀请制注册 + JWT + refresh + GitHub OAuth）
                 invites/     邀请（成员生命周期入口）
                 notifications/ 通知中心
                 gateway/     socket.io 网关（user:<id> / all rooms 实时推送）
  capabilities/  能力包（= 插件，每个含 manifest + 权限点 + 工具 + 事件）
                 example/       最小模板（照此复制新能力包）
                 announcement/  公告 + 已读追踪
                 idea-wall/     点子墙 + 转正
                 project/       项目 + 任务闭环
                 community/     社区 + @提及
packages/shared  契约层（前后端共享类型）
deploy/         生产构建脚本 + nginx 配置
```

## 开发

```bash
export PATH="$HOME/.local/bin:$PATH"   # node v24（~/.local/bin）必加：pnpm 11 需要 node 24
pnpm install
pnpm dev:api    # 内核 http://127.0.0.1:8093/api
pnpm dev:web    # 前端 http://127.0.0.1:5175（proxy /api + /socket.io → 8093）
```

- 数据库：PostgreSQL 16 容器（本地 `cyberswat-dev-db`，127.0.0.1:5433）
- 迁移：`cd apps/api && pnpm exec prisma migrate dev`
- 新增能力包模板：`apps/api/src/capabilities/example/` + `apps/web/src/capabilities/example/`（后端 manifest 与前端 ui 声明一一对应）

## 生产部署（已上线）

```
dev.cyberswat.cn → CF Edge → CF Tunnel (2615b5fa, 远程配置) → localhost:8092 nginx
  ├→ cyberswat-dev-web   (nginx:alpine, SPA + 反代 API/socket.io)
  ├→ cyberswat-dev-api   (node:24-slim, 内网 8093, 启动自动 prisma migrate deploy)
  └→ cyberswat-dev-db-prod (postgres:16-alpine, 内网 5432)
```

一键部署：`./deploy/build.sh`（宿主 pnpm build → pnpm deploy 产物 → 镜像 COPY → compose up）

```bash
# 手动重建 API（改代码后）
cd apps/api && ../../node_modules/.bin/tsc -p tsconfig.build.json
cp -r dist ../deploy/api/dist
docker build -f Dockerfile.api -t cyberswat-dev-api:latest .
docker rm -f cyberswat-dev-api && docker run -d --name cyberswat-dev-api \
  --network cyberswat-dev-portal_cyberdev --network-alias dev-api \
  -e JWT_SECRET=... -e DATABASE_URL=postgresql://cyberswat:...@cyberswat-dev-db-prod:5432/cyberswat_dev \
  -e API_PORT=8093 -e FRONTEND_ORIGIN=https://dev.cyberswat.cn \
  -e PUBLIC_API_URL=https://dev.cyberswat.cn -e NODE_ENV=production \
  cyberswat-dev-api:latest sh -c "npx prisma migrate deploy && node dist/main.js"
```

⚠️ 生产环境变量：JWT_SECRET / DB 密码仍是 dev 值，正式对外前必须更换。

## 测试账号（生产库）

- 部长：`leader@cyberswat.cn` / `password123`（dept-leader）
- 成员：`member@cyberswat.cn` / `password123`（member）

## 里程碑

- [x] M0 骨架 · [x] M1 认证+公告 · [x] M2 点子墙+成员 · [x] M3 任务+孵化 · [x] M4 社区+实时 · [x] M5 上线+端到端验证（2026-08-15）

## 文档

- `AGENTS.md` — 项目记忆（决策/环境/部署/已知坑/待办）
- 主仓库 `cyberswat-portal/docs/`：PRD / 技术选型 / 插件化架构评估
