# CONTRIBUTING — 参与开发部子站开发

> 适用于本仓（cyberswat-dev-portal）的多人 / 多 Agent 协作。
> 本仓为开发部子站（dev.cyberswat.cn），架构与通用规范以本文件 + `AGENTS.md` 为准。

## 改动前必读

1. `AGENTS.md` — 项目身份、关键决策、已知坑（**必须读**，尤其 pnpm 构建脚本批准 / `verifyDepsBeforeRun` / docker 部署链路）
2. `README.md` — 功能全景、架构、端口约定、部署步骤
3. `docs/` — 插件架构评估 / 技术选型 / 迭代计划（R1/R2）、前端设计（FRONTEND.md）等
4. 验证命令：提交前必须 **`pnpm check` 全绿**（= `pnpm lint && pnpm typecheck && pnpm test && pnpm build`）

## 环境

- Node v24.11.1（`~/.local/bin/node`，系统 `/usr/bin/node` 是 v22，pnpm 会 SQLite 故障）
- pnpm 11.17.0（corepack），同根 `package.json` 已锁 `packageManager`
- api e2e 测试需本地 postgres：`cyberswat-dev-db` 容器（127.0.0.1:5433，`cyberswat_test` 隔离库）；无该库时用 CI 的 postgres service

## 提交规范（Conventional Commits）

- 格式 `type(scope): subject`；type ∈ `feat / fix / docs / style / refactor / test / chore`
- scope 用真实模块名：如 `feat(idea-wall)`、`fix(oauth)`、`docs(infra)`、`chore(toolchain)`
- subject 中文可接受；同一次 PR 内拆分：`fix(infra)` 配置类 / `chore(toolchain)` 工具链 / `chore(format)` 格式化

## 分支与流程

- `main` = 生产（可直接发布）；功能/修复走 `feature/*`、`fix/*`，经 PR 合并
- 多 Agent 并行：各开独立分支；改动同一文件前基于最新 `main`；合并前检测冲突
- 双仓双推：`git push origin main` 同时推个人仓（AYin-Z）与组织仓（PPSUC-CyberSWAT）；fetch 只从个人仓

## 门禁（CI `pnpm check` 全绿）

- **lint**：ESLint flat。`@typescript-eslint/no-explicit-any` 为 **error**（禁 any 的机器强制）；空 catch 报错
- **typecheck**：统一 `tsconfig.base.json`；`pnpm -r typecheck`
- **test**：`pnpm -r test`（web 67 + api 15，api e2e 需 `cyberswat_test` 库）
- **build**：`pnpm -r build`
- **格式化**：Prettier（`.prettierrc.json`）；`docs/`、`pnpm-lock.yaml`、`deploy/` 已忽略
- 数据一致性 / 测试用例：新增/修改业务数据或契约时同步补 `*.test.ts`

## 新增 capability 包的要求

插件化架构 = 内核（`apps/api/src/core/` + `packages/shared/`）+ 能力包（`apps/api/src/capabilities/` + `apps/web/src/capabilities/`）。新增能力包需：

1. **api 端**（`apps/api/src/capabilities/<name>/`）
   - 新建 `*.module.ts`（NestJS module）、`*.controller.ts`、`*.service.ts`、`*.manifest.ts`（插件清单）
   - 在内核拦截/注册点把 manifest 注册进插件注册表（`PluginRegistry`/内核 module）
   - 用权限点（`PermissionPoint`）声明写权限；事件走 `EventBus`；agent 可调工具走 `ToolRegistry`
   - 数据模型用命名空间前缀（`core_` / `<name>_`），新增模型需 `prisma migrate dev` 并提交 migration
2. **web 端**（`apps/web/src/capabilities/<name>/`）
   - 新建视图 + `*.manifest.ts` / 菜单/UI 贡献项，注册进前端能力包清单
3. **五个扩展点**：事件总线 / 工具注册表 / UI 贡献 / 权限点 / 数据模型 —— 新能力包至少覆盖所需扩展点
4. 模板参考：`apps/api/src/capabilities/example/` + `apps/web/src/capabilities/example/`

## 契约改动需同步 packages/shared

`packages/shared` 是跨包契约的单一事实源（`PluginManifest` / `Role` / `PermissionPoint` / `ToolDefinition` / `CoreEventMap` / `UserProfile` / `ApiResponse` 等）。改动契约时：

1. 修改 `packages/shared/src/index.ts`
2. 同步重建：`pnpm --filter @cyberswat/shared build`（api 编译走 dist；web 走源码 alias）
3. 同步更新所有消费方：`apps/api` 与 `apps/web` 中对该共享类型的 import / 赋值
4. 若契约影响 e2e / 前端测试，同步补测试并 `pnpm check` 全绿后再提交

## 验证命令速查

```bash
pnpm install --frozen-lockfile   # 依赖安装（lockfile 为准）
pnpm check                        # 提交前完整门禁 = lint + typecheck + test + build
pnpm typecheck && pnpm test && pnpm build   # 快速三项
pnpm --filter @cyberswat/shared build       # 共享契约改动后重建
pnpm --filter @cyberswat/dev-api test       # api 单独测试（需 cyberswat_test 库）
pnpm --filter @cyberswat/dev-web test       # web 单独测试
```
