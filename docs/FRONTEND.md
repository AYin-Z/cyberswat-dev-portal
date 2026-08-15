# CyberSWAT 开发部子站 — 前端设计定稿（FRONTEND v1.0）

> 日期：2026-08-15 · 状态：✅ 已拍板（组件库/布局/风格/排期四项决策）
> 现状诊断：17 页面全手写 scoped CSS，零组件库/零 token/零图标/零统一反馈 → 风格漂移
> 原则：**工作台为主 + 轻品牌点缀**；基建先行，业务页直接落在新基建上

## 0. 四项决策（2026-08-15 用户拍板）

1. **组件库**：Naive UI（TS 一等公民 / 暗色内置 / 按需引入 / themeOverrides 全局 token）
2. **布局**：侧边栏工作台式（能力包 manifest 自动注入菜单，防顶部导航溢出）
3. **风格**：业务页纯工具化（信息密度高），登录页/首页保留 CyberSWAT SOC 气质
4. **排期**：基建先行（2-3 天：组件库+主题+布局+通用组件），R1 业务页全部落在新基建上

## 1. 设计 token（对齐主站 0d1117 深色科技血统）

### 色彩（Naive UI themeOverrides.common）
```
primary   #58a6ff  （主站 accent，全站主色）
success   #3fb950   warning #d29922   error #f85149   info #58a6ff
背景层级:  body #0d1117 → card #161b22 → hover/raised #21262d（GitHub 深色系）
文字:      primary #e6edf3 / secondary #8b949e / disabled #484f58
边框:      #30363d（card 分隔）/ #21262d（弱分隔）
```

### 字体与圆角
```
正文: 系统字体栈（-apple-system/Segoe UI/Noto Sans SC）
代码/数字: JetBrains Mono（主站已本地化 woff2，子站复用或引用）
圆角: 6px（控件）/ 8px（卡片）/ 999px（徽章）
间距: 4 的倍数（8/12/16/24），内容区 padding 24px
```

### 状态徽章体系（全站统一，替代现在各写各的）
```
任务: TODO 灰 / IN_PROGRESS 蓝 / REVIEW 黄 / DONE 绿
点子: RECRUITING 绿 / INCUBATING 蓝 / PROMOTED 黄 / ARCHIVED 灰
项目: ACTIVE 绿 / PAUSED 黄 / DONE 蓝 / ARCHIVED 灰
优先级: LOW 灰 / MEDIUM 黄 / HIGH 红 / URGENT 红(实心)
```

## 2. 布局结构（侧边栏工作台）

```
┌──────────┬──────────────────────────────────┐
│ 侧边栏 220px│ 顶栏 56px                        │
│           │ 页标题/面包屑 · 通知铃铛 · 用户菜单  │
│ LOGO       ├──────────────────────────────────┤
│ CYBERSWAT  │                                  │
│ ·DEV       │       内容区（全宽 + padding 24）  │
│ ───────    │                                  │
│ 菜单        │                                  │
│ (manifest  │                                  │
│  注入:      │                                  │
│  首页/公告/  │                                  │
│  点子墙/项目 │                                  │
│  任务/社区/  │                                  │
│  成员/邀请)  │                                  │
│           │                                  │
│ ───────    │                                  │
│ 用户卡片    │                                  │
│ (头像/昵称/  │                                  │
│  角色/退出)  │                                  │
└──────────┴──────────────────────────────────┘
折叠态: 64px 图标-only（responsive: <768px 自动折叠为抽屉）
菜单数据源: ui.menu（能力包 manifest 组合，与后端插件一一对应）
```

## 3. 通用组件清单（Naive UI 之上少量封装）

| 组件 | 用途 |
|---|---|
| `PageHeader` | 页标题 + 描述 + 右侧操作区（全站统一页头） |
| `StatusBadge` | 状态徽章（状态→文案/颜色映射表驱动，能力包可注册映射） |
| `EmptyState` | 空状态（图标 + 文案 + CTA 按钮） |
| `ListSkeleton` | 列表加载骨架屏 |
| `AppAvatar` | 用户头像（GitHub 头像 / 昵称首字母 fallback） |
| `ConfirmAction` | 危险操作确认（删除/撤销/驳回统一交互） |

Toast/Modal/Form/Table 直接用 Naive UI，不重复封装。

## 4. 页面改造优先级（基建完成后逐页落）

```
第一批（第一印象）:  登录页 · 注册页 · 首页仪表盘
第二批（核心业务）:  任务看板(拖拽) · 点子墙列表/详情/发布
第三批（业务完善）:  公告 · 社区 · 项目 · 成员
第四批（管理功能）:  邀请管理 · 通知面板
R1 新页面:         个人资料编辑页（直接落在新基建上）
```

## 5. 首页仪表盘（"我的工作台"，替代占位卡片）

```
┌ 我的任务（按状态分组，前 5 条）      ┐  ┌ 未读通知（前 5 条 + 全部已读）┐
├ 匹配我的点子（招募中 + 技能匹配）    │  ├ 最近公告（未读优先）          │
└ 快速入口（发布点子/新任务/发帖）     ┘  └ 本周概览（任务完成/点子/帖子）  ┘
```
信息源全部已有 API（tasks/notifications/ideas/announcements），纯前端聚合。

## 6. 基建实施清单（2-3 天）

```
1. 安装 Naive UI + 图标库（@vicons/ionicons5 或 xicons）
2. 主题模块: src/theme/（themeOverrides token + 暗色配置 + 全局样式重置）
3. 布局改造: App.vue → 侧边栏 + 顶栏 + RouterView（NLayout 体系）
4. 通用组件: PageHeader/StatusBadge/EmptyState/ListSkeleton/ConfirmAction
5. 菜单适配: ui.menu 注入侧边栏（含折叠态图标）
6. 通知铃铛: 重做（Naive Badge + Popover，保留 socket 实时）
7. 首页仪表盘 + 登录/注册页重做
```

## 7. 明确不做（边界）

- ❌ 不引入状态管理重构（Pinia 现状够用，ui store 适配新菜单即可）
- ❌ 不做移动端完整适配（折叠侧边栏 + 基本响应式即可，内部系统桌面优先）
- ❌ 不做暗/亮双主题切换（单深色主题，主站一致）
- ❌ 不引入 CSS 框架（Tailwind 等）——Naive UI + 少量全局样式足够
