# 前端设计调研 — 成熟商业化方案参考

> 日期：2026-08-15 · 用途：为 FRONTEND.md 设计定稿提供商业化产品依据
> 对象：深色主题的团队协作工作台（任务/社区/公告/成员/通知）

## 1. 参考产品矩阵

| 产品 | 定位 | 与我们重合点 | 参考价值 |
|---|---|---|---|
| **Linear** | 深色设计标杆（项目管理） | 任务/工作台/深色 | ★★★ 设计语言 |
| **GitHub Primer** | 设计系统（深色双模式） | token 语义/组件 | ★★★ 设计 token |
| **GitHub Projects** | 看板/项目视图 | 任务看板交互 | ★★ 交互细节 |
| **Discourse** | 社区论坛 | 帖子/评论 | ★★ 社区信息架构 |
| **Vercel/Supabase Dashboard** | SaaS 工作台 | 仪表盘/聚合 | ★★ 工作台布局 |
| **飞书/语雀** | 国内协作 | 卡片/信息密度 | ★ 国内习惯 |

## 2. Linear 可借鉴点（深色工作台设计语言）

来源：[linear-ui-skills](https://github.com/ihlamury/design-skills/tree/main/linear-ui-skills)、[shadcn Linear Design System](https://www.shadcn.io/design/linear)

```
色彩（Linear 深色约束）:
- 页面背景 lightness < 20（Linear 用 #080A0A，比我们的 #0d1117 更黑）
- 语义 token 分层: surface-base / surface-raised / surface-overlay
                   text-primary / text-secondary / text-tertiary / border-default
- 全站 ≤10 个主色（克制）
- 对比度 ≥ 4.5:1（无障碍硬标准）

字体: Inter（OFL 开源可自托管）单一字体家族；4px 网格；tabular-nums 数字对齐
字号阶梯: 60(hero) / 17(body) / 16 / 15 / 14(次要)
```

**映射到我们**：
- token 命名从"颜色值"升级为"语义名"（surface/text/border 层级）——PRIMER.md 已列 #0d1117 等值，需补语义层
- 4px 网格 + tabular-nums（我们的看板数字/统计正好需要）
- 字号阶梯收敛（现在各页面随意）

## 3. GitHub Primer 可借鉴点（token 架构）

来源：[Primer Color 文档](https://primer.style/product/getting-started/foundations/color-usage)、[@primer/primitives](https://www.npmjs.com/package/@primer/primitives)

```
三层 token 架构:
1. Presentational（色彩刻度）: scale.blue.5 等，模式无关
2. Functional（语义）: fg-default/bg-default/border-default + 色彩角色
   accent/success/attention/danger/severe/open/closed/done
3. Component（组件级）: button.bg / input.border 等

关键洞察: 我们的 #0d1117/#58a6ff/#3fb950/#d29922/#f85149
         恰好就是 Primer 深色 functional token 的值（bg-canvas/blue-5/green-5/yellow-5/red-5）
         → 方向天然正确，只需补"语义命名层"
```

**映射到我们**：themeOverrides 按 Primer 语义命名（bg-card/border-default/fg-muted + 角色色），
future 能力包扩展直接引用语义名，不碰具体色值。

## 4. 看板交互可借鉴点（任务看板是交互最重页面）

来源：[GitHub Projects UX](https://github.com/luketmoss/hive/issues/126)、[SaaS Drag-and-Drop UX Patterns 2026](https://www.saasui.design/blog/saas-drag-and-drop-reordering-ux-patterns)、[Taska UI Kit](https://ones.com/blog/inside-the-taska-ui-kit-design-patterns-for-task-project-apps/)

```
拖拽触发设计之争（关键决策）:
- GitHub Projects 模式: click-hold-to-drag（按住拖动）vs 专用 drag handle
- 冲突点: 卡片既要"点击打开"又要"拖拽移动"——两者触发必须明确分离
- 结论（社区共识）: 卡片本体 click 打开；拖拽用 hover 显示 drag handle 或按住拖动，
  移动端用"菜单移动"兜底

其他模式:
- 列头显示计数 + 状态色条
- 拖拽占位（placeholder）而不是幽灵卡片（视觉噪音小）
- 操作按钮 hover 显示（不常驻占空间）
```

**映射到我们**：任务看板用 Naive UI 生态的 vue-draggable-next（vuedraggable for Vue3），
卡片点击进详情 + drag handle 拖拽（避免与点击冲突）。

## 5. 社区信息架构可借鉴点（帖子/评论）

来源：[Discourse Flat Threading](https://community.lsst.org/t/understanding-and-using-discourses-flat-threading/150)、[飞书卡片](https://open.feishu.cn/document/uAjLw4CM/ukzMukzMukzM/feishu-cards/card-components/content-components/plain-text.md?lang=zh-CN)

```
- Discourse 坚持 flat threading（平铺评论）理由: 移动端可读性 / 回复上下文靠引用而非缩进
  → 我们现在的平铺评论方向正确，补"引用回复"即可（不引入嵌套缩进）
- 操作行内化: 点赞/回复/举报 放评论尾部行内（当前已接近）
- 帖子列表: 标题 + 元信息（作者/时间/回复数/点赞）左对齐，板块徽章前置（我们已有）
- 空状态 CTA（Discourse 首帖引导）: 我们 EmptyState 组件补"发第一帖"CTA
```

## 6. 工作台布局可借鉴点（仪表盘/聚合）

来源：[10 Best SaaS Dashboard Design Examples](https://adminlte.io/blog/saas-dashboard-design-examples/)

```
- 顶部行: 关键指标卡（KPI 卡: 数字 + 趋势 + 微图表）
- 中区: 主任务列表（我的任务/待办）占宽 2/3，辅助信息（通知/公告）占 1/3
- 右侧/底部: 活动流（最近动态时间线）
- 空态即引导（dashboard 无数据时展示"创建第一个任务"引导）
```

**映射到我们**：仪表盘按"KPI 卡 + 我的任务(2/3) + 通知/公告(1/3)"布局，
空态引导（无任务 → 引导发点子/建任务）。

## 7. 综合结论 → 对 FRONTEND.md 的修正建议

| 项 | 原定稿 | 调研修正 |
|---|---|---|
| token 命名 | 颜色值直接写 | **语义命名层**（Primer 三层架构），色值引用不散落 |
| 背景 | #0d1117 单一 | 补 **surface 层级**（base #0d1117 / raised #161b22 / overlay #21262d），Linear 式命名 |
| 字体 | 系统栈 + JetBrains Mono | 可选：**本地化 Inter**（OFL 免费，Linear 同款）；至少 4px 网格 + tabular-nums |
| 对比度 | 未定 | **≥4.5:1 硬标准**（无障碍 + 深色可读性） |
| 看板 | 无拖拽方案 | **click 打开 + drag handle 拖拽**（vue-draggable-next），列计数 + 占位样式 |
| 社区 | 平铺评论 ✅ | 补**引用回复**（不嵌套），操作行内化 ✅ |
| 仪表盘 | 已定模块 | 按 **KPI 卡 + 2/3-1/3 布局** + 空态引导 |
| 颜色克制 | 未强调 | **全站 ≤10 主色**（Linear 纪律），状态色只用于语义 |

**核心洞察**：我们的深色 token 值（0d1117/58a6ff/3fb950/d29922/f85149）与 Primer 深色语义色完全同源，
方向正确——缺的是**语义命名层 + Linear 式层级纪律**，不是换色板。
