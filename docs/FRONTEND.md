# CyberSWAT 开发部子站 — 前端设计定稿（FRONTEND v1.0）

> 日期：2026-08-15 · 状态：✅ v1.1 定稿（四项决策 + 商业化调研 8 项修正，调研见 RESEARCH-FRONTEND.md）
> 现状诊断：17 页面全手写 scoped CSS，零组件库/零 token/零图标/零统一反馈 → 风格漂移
> 原则：**工作台为主 + 轻品牌点缀**；基建先行，业务页直接落在新基建上
> 调研核心洞察：现有深色 token 值（0d1117/58a6ff/3fb950/d29922/f85149）与 GitHub Primer 深色语义色
> 完全同源——缺的是语义命名层 + Linear 式层级纪律，不是换色板

## 0. 四项决策（2026-08-15 用户拍板）

1. **组件库**：Naive UI（TS 一等公民 / 暗色内置 / 按需引入 / themeOverrides 全局 token）
2. **布局**：侧边栏工作台式（能力包 manifest 自动注入菜单，防顶部导航溢出）
3. **风格**：业务页纯工具化（信息密度高），登录页/首页保留 CyberSWAT SOC 气质
4. **排期**：基建先行（2-3 天：组件库+主题+布局+通用组件），R1 业务页全部落在新基建上

## 1. 设计 token（Primer 三层架构 + Linear 层级纪律，调研修正①）

### 语义命名层（Functional token — 代码只引用语义名，不写裸色值）
```
画布与表面（dark-saas / Linear-inspired，来源: dsh-design-skills 技能包）:
  canvas        #0d1117   页面背景（近黑带蓝黑，勿用纯黑）
  surface-1     #161b22   卡片/面板
  surface-2     #1c2128   浮层/分组/hover
  surface-3     #21262d   次级 hover/抽屉
  surface-4     #242a33   选中态
hairline（1px 细线分隔，层级靠表面色不靠阴影）:
  hairline      #30363d   默认分隔线
  hairline-strong #34343a 强调分隔
  hairline-subtle #21262d 弱分隔
ink 文字层级:
  ink           #e6edf3   主文字
  ink-muted     #d0d6e0   次级文字
  ink-subtle    #8b949e   弱化/说明
  ink-tertiary  #62666d   占位符/禁用
角色色（仅语义用途）:
  accent #58a6ff  accent-hover #79b8ff  success #3fb950  warning #d29922  danger #f85149
```
色值基线：Primer 深色 functional token（与主站同源）+ dark-saas 层级结构（4 级表面/3 级描边/4 级文字）。

### 纪律（调研修正⑧ + dark-saas 原则）
- **一个强调色**：accent 只出现在 CTA/焦点环/品牌标记，绝不做装饰性点缀
- **层级靠表面色 + hairline**，避免大面积投影（卡片无阴影或极淡）
- 颜色只用于语义，新增色值必须先进 token 层，页面内禁止裸色值
- 对比度 ≥ 4.5:1 硬标准（深色可读性 + 无障碍）

### 字体与网格（调研修正③）
```
正文: 系统字体栈（-apple-system/Segoe UI/Noto Sans SC）——零加载成本
可选升级: 本地化 Inter（OFL 开源，Linear 同款）——与主站品牌一致时再引入
代码/数字: JetBrains Mono（主站已本地化 woff2，子站复用或引用）
数字对齐: tabular-nums（看板计数/统计/KPI 卡数字对齐）★
网格: 4px 基准（8/12/16/24/32），内容区 padding 24px
圆角: 6px（控件）/ 8px（卡片）/ 999px（徽章）
字号阶梯: 24(页标题) / 17(正文) / 15(卡片标题) / 14(次要) / 12(元信息)——收敛现散乱字号
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
第二批（核心业务）:  任务看板 · 点子墙列表/详情/发布

### 任务看板交互（调研修正④ — GitHub Projects 共识）
```
- 卡片本体 click → 打开详情（不与拖拽冲突）
- hover 显示 drag handle → 按住拖拽换列（vue-draggable-next，Vue3 生态）
- 拖拽用占位样式（placeholder）而非幽灵卡片
- 列头: 状态名 + 计数徽章 + 状态色条
- 操作按钮 hover 显示（不常驻占空间）
- 移动端兜底: 卡片菜单"移动到"（无拖拽环境）
```
第三批（业务完善）:  公告 · 社区 · 项目 · 成员

### 社区交互（调研修正⑤ — Discourse 平铺共识）
```
- 评论平铺（不嵌套缩进）✅ 现状正确
- 补"引用回复": 回复时带被引内容（平铺下的上下文方式）
- 操作行内化: 点赞/回复/举报 常驻评论尾部（现状接近）
- 帖子列表: 板块徽章前置 + 标题 + 元信息左对齐（现状已有）
- 空状态 CTA: EmptyState 补"发第一帖"引导
```
第四批（管理功能）:  邀请管理 · 通知面板
R1 新页面:         个人资料编辑页（直接落在新基建上）
```

## 5. 首页仪表盘（"我的工作台"，替代占位卡片）

```
┌─ KPI 行（调研修正⑦）────────────────────────────┐
│ 待办任务  进行中  待验收  未读通知                │
│ (数字 + tabular-nums 对齐)                       │
├─ 主体 2/3 ────────────────┬─ 侧栏 1/3 ──────────┤
│ 我的任务（状态分组，前 5）   │ 未读通知（前 5+已读） │
│ 匹配我的点子（招募中+技能）  │ 最近公告（未读优先）  │
│ 最近动态（活动流时间线）     │ 快速入口            │
└──────────────────────────┴──────────────────────┘
空态即引导: 无任务 → "创建第一个任务" / 无点子 → "去发点子"
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

## 6.5 调研修正汇总（2026-08-15，源自 RESEARCH-FRONTEND.md）

| # | 修正 | 落点 |
|---|---|---|
| ① | token 语义命名层（Primer 三层架构） | §1 |
| ② | surface 层级（base/raised/overlay，Linear 式） | §1 |
| ③ | 4px 网格 + tabular-nums + 字号阶梯；Inter 可选 | §1 |
| ④ | 看板 click 打开 + drag handle 拖拽（GitHub Projects 共识） | §4 |
| ⑤ | 社区平铺评论 + 引用回复 + 操作行内化（Discourse 共识） | §4 |
| ⑥ | 仪表盘 KPI 卡 + 2/3-1/3 布局 + 空态引导 | §5 |
| ⑦ | （并入⑥） | — |
| ⑧ | 全站 ≤10 主色纪律 + 对比度 ≥4.5:1 | §1 |

## 7. 明确不做（边界）

- ❌ 不引入状态管理重构（Pinia 现状够用，ui store 适配新菜单即可）
- ❌ 不做移动端完整适配（折叠侧边栏 + 基本响应式即可，内部系统桌面优先）
- ❌ 不做暗/亮双主题切换（单深色主题，主站一致）
- ❌ 不引入 CSS 框架（Tailwind 等）——Naive UI + 少量全局样式足够
