# cyberswat-dev-portal

CyberSWAT 网络特警队 **开发部子站系统**（dev.cyberswat.cn）。

插件化架构 monorepo：公告发布 / 信息流转 / 轻量社区 / 点子墙，未来扩展部门 agent。

## 技术栈

- **API**: NestJS 11 + Prisma + PostgreSQL 16 + JWT + GitHub OAuth（M1）+ socket.io（M2）
- **Web**: Vue3 + Vite + TS + Pinia（与主站同栈）
- **共享契约**: packages/shared（插件清单/权限点/工具/事件类型）

## 架构

```
apps/web      Vue3 前端（manifest 驱动 UI 贡献点）
apps/api      NestJS 内核（插件注册表/权限点/事件总线/工具注册表/认证/用户）
  core/         内核模块（稳定骨架，不是插件）
  capabilities/ 能力包（公告/点子墙/社区/任务... = 插件）
packages/shared 共享类型契约
docs/         设计文档（PRD/选型/插件化评估）
```

详见 `docs/`：设计哲学与评估（插件化架构）、`apps/api/src/capabilities/example/`（能力包最小模板）。

## 开发

```bash
export PATH="$HOME/.local/bin:$PATH"   # node v24 + pnpm 11
pnpm install
pnpm dev:api    # 内核 http://127.0.0.1:8093/api
pnpm dev:web    # 前端 http://127.0.0.1:5175
```

## 部署（规划）

dev.cyberswat.cn → CF Tunnel → 8092 nginx → dev-api 内网 8093 + PostgreSQL 容器。
