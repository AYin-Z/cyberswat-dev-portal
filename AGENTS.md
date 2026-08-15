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
- 设计文档：docs/plugin-architecture-eval.md（调研与评估）、docs/tech-stack-analysis.md（选型）；整体 PRD 在主仓库 cyberswat-portal/docs/PRD.md

## 功能状态（2026-08-15 第一版全功能上线）
- ✅ 认证：邀请制注册（令牌哈希/名额/撤销）+ bcrypt + JWT + refresh 轮换 + GitHub OAuth（代码就绪待配置）
- ✅ 公告：发布/已读追踪/重要确认/部长名单（announcement_ 命名空间）
- ✅ 点子墙：发布/加入（自动转孵化）/转正（idea_wall_ 命名空间）
- ✅ 项目任务：转正关联/成员/任务闭环 指派→接单→提交→验收（project_ 命名空间）
- ✅ 社区：4 板块/评论/点赞/@提及（community_ 命名空间）
- ✅ 实时：socket.io 网关（JWT 认证，user:<id> 定向 + all 广播）+ 通知中心（core_notifications）
- ✅ agent 工具注册表：8 工具（3 需审批），全量审计（core_tool_calls）

## 环境
- Node v24.11.1 在 ~/.local/bin/node（系统 /usr/bin/node 是 v22，pnpm 会 SQLite 故障）
- pnpm 11.17.0（corepack），PATH 需含 ~/.local/bin
- pnpm 11 构建脚本批准：pnpm-workspace.yaml 用 **allowBuilds**（不是 onlyBuiltDependencies，两者都写时 allowBuilds 生效）
- 本地 PG：cyberswat-dev-db 容器（127.0.0.1:5433）；生产：cyberswat-dev-db-prod（compose 内网）

## 开发命令
- pnpm dev:api → 内核 127.0.0.1:8093/api（main.ts 绑 0.0.0.0，API_HOST 可覆盖）
- pnpm dev:web → 前端 127.0.0.1:5175（proxy /api + /socket.io → 8093）
- 能力包模板：apps/api/src/capabilities/example/ + apps/web/src/capabilities/example/
- 迁移：apps/api 下 `pnpm exec prisma migrate dev`；生产容器启动自动 `prisma migrate deploy`
- shared 契约改动：`pnpm --filter @cyberswat/shared build`（api 编译走 dist；web 走源码 alias）

## 生产部署（已上线 2026-08-15）
```
dev.cyberswat.cn → CF Tunnel(2615b5fa, 远程配置) → localhost:8092 → cyberswat-dev-web(nginx:alpine)
  ├ 反代 /api + /socket.io → dev-api:8093（容器别名 dev-api）
  └ dev-api(node:24-slim) + dev-db-prod(postgres:16-alpine, 内网)
```
- 构建模式：宿主 pnpm build → `pnpm --filter @cyberswat/dev-api deploy --prod --legacy deploy/api` → 镜像 COPY
  （容器内不做 npm，规避 fake-ip 坑；deploy/api 不入库，见 .gitignore）
- **prisma 在 api 的 dependencies**（非 devDependencies）——deploy 产物才自带 CLI 跑 migrate
- 镜像构建后必须删旧容器重建（compose 会缓存旧 image ID）：`docker rm -f cyberswat-dev-api && docker run -d ...`（命令见 README）
- 上线三件套（主仓库 AGENTS.md 有完整 API 流程）：
  1. CF API PUT tunnel configurations 插入 `dev.cyberswat.cn → http://localhost:8092`（在 catch-all 前）
  2. DNS CNAME：dev → 2615b5fa-3500-4921-97ba-19d602660cda.cfargotunnel.com（proxied）
  3. 验证 https://dev.cyberswat.cn + /api/health
- 生产测试账号：leader@cyberswat.cn / member@cyberswat.cn（密码 password123）

## 已知坑（本仓库特有）
- **alpine 镜像 Prisma 引擎缺失**：宿主生成的是 glibc 引擎，alpine(musl) 报 "could not locate Query Engine" → 用 node:24-slim
- **slim 需装 openssl**：Dockerfile.api 有 `apt-get install openssl`（Prisma 检测 libssl 版本）
- **API 容器绑定**：main.ts 绑 0.0.0.0（nginx 从 docker 网络反代；公网不暴露该端口）
- **nginx upstream 解析**：docker run 手动起容器时要 `--network-alias dev-api`（或先 network connect 再 restart）
- **pnpm deploy 后不要再对 deploy/api 跑 pnpm add**：会向上找到根 workspace 把链接指回宿主 node_modules，容器内断链 → 需要时把包加进 apps/api/package.json 重新 deploy
- **compose 镜像缓存**：`docker compose up -d` 不重建已存在容器，build 新镜像后需 `docker rm -f` 再 up（或 force-recreate 仍可能用旧 ID，手动 run 最稳）
- **socket.io 广播**：客户端要 join 'all' room 才能收全员广播（公告/点子）；定向通知走 user:<id>
- **测试注意**：register 需要邀请令牌；无令牌/已用/过期/撤销全拦截

## 里程碑
- [x] M0: 仓库 + monorepo 骨架 + 内核（插件注册表/权限点/事件总线/工具注册表/认证占位）
- [x] M1a: Prisma 落库（PostgreSQL 16 容器 5433）+ bcrypt 认证 + GitHub OAuth（代码就绪，client id/secret 待填）
- [x] M1b: 公告能力包（发布/已读追踪/重要确认/部长名单/agent 工具带审批）
- [x] M1c: 邀请制成员生命周期 + refresh token 轮换
- [x] M2a: 点子墙能力包（发布/招募/加入/状态流转/转正预留 + agent 工具）
- [x] M2b: 成员主页（Vidar 卡片，脱敏）
- [x] M3: 任务分派 + 点子孵化（项目表 + 转正关联 + 任务闭环）
- [x] M4: 轻量社区（帖子/评论/点赞/@提及 + socket.io 实时通知）
- [x] M5: 上线 dev.cyberswat.cn（Docker 容器 8092 + CF Tunnel ingress + DNS CNAME）
- [x] 全功能端到端线上验证（2026-08-15）

## 待办（下一轮迭代）
- 迭代计划：docs/ITERATION-R1.md（人力匹配优先）+ docs/ITERATION-R2.md（agent 体系）；体系愿景见主仓库 docs/VISION.md（v1.2）
- **AI 友好决策（2026-08-15 拍板）**：系统是一等 MCP Server——OAuth 2.1 + PKCE + RFC 7591 DCR，
  全量工具自动暴露，agent 权限=成员权限继承+审批兜底+审计（agentId 字段第一版已预留）
- [ ] R1-P1 个人资料编辑页（技能词表结构化，agent 燃料）/ R1-P2 点子匹配通知 / R1-P3 通知 UI / R1-P4 体验小修 / R1-S1 生产凭证更换
- [ ] R2-A 内置 bot（社区嵌入式）/ R2-B MCP Server（OAuth 2.1+DCR）/ R2-C /agent 接入页
- [x] GitHub OAuth 配置（2026-08-15）：OAuth App 已创建（CyberSWAT 开发部子站，回调 https://dev.cyberswat.cn/api/auth/github/callback），
  凭据存 ~/.cyberswat-dev-prod.env（权限 600，不入库），容器 --env-file 注入
  - 授权链路已验证：/api/auth/github/login → 302 github.com 授权页（client_id 正确），本地+线上均通
  - ✅ 浏览器全流程点验通过（2026-08-15）：GitHub 登录 → 自动建号（AYin-Z → Ayin, MEMBER, githubId 绑定落库）
- [ ] 个人资料编辑页（年级/技能/签名/links 维护）—— 数据模型已就绪（core_users）
- [ ] 部门 agent v0（后台 agent：事件订阅 + 工具调用 + 草稿态写操作）—— L1 路线
- [ ] 招新页（成员主页"加入我们"入口）—— Vidar 的 Join us 模式
- [ ] 邀请管理页完善（创建干部邀请目前可用，前端已支持）
