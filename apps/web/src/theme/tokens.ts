/**
 * CyberSWAT 开发部子站 — 设计 Token（dark-saas 结构 × 品牌色值）
 *
 * 规范来源：
 *  - 结构：dsh-design-skills 技能包 dark-saas（Linear-inspired）——4 级表面 / hairline / ink 层级
 *  - 色值：与主站 cyberswat.cn 同源（0d1117 底 + #58a6ff 主色，GitHub Primer 深色系）
 *
 * 使用纪律（dark-saas）：
 *  - 一个强调色：accent 只用于 CTA/焦点环/品牌标记，绝不做装饰
 *  - 层级靠表面色 + hairline 1px 细线，避免粗阴影
 *  - 颜色只用于语义，页面内禁止裸色值
 *  - 对比度 ≥ 4.5:1
 */

export const tokens = {
  /** 画布与表面（层级靠表面色，不靠阴影） */
  canvas: '#0d1117', // 页面背景（近黑带蓝黑）
  surface1: '#161b22', // 卡片/面板
  surface2: '#1c2128', // 浮层/分组/hover
  surface3: '#21262d', // 次级 hover/抽屉
  surface4: '#242a33', // 选中态

  /** hairline 1px 分隔线 */
  hairline: '#30363d', // 默认分隔
  hairlineStrong: '#34343a', // 强调分隔
  hairlineSubtle: '#21262d', // 弱分隔

  /** ink 文字层级 */
  ink: '#e6edf3', // 主文字
  inkMuted: '#d0d6e0', // 次级文字
  inkSubtle: '#8b949e', // 弱化/说明
  inkTertiary: '#62666d', // 占位符/禁用

  /** 角色色（仅语义用途） */
  accent: '#58a6ff', // 唯一强调色（主站同款）
  accentHover: '#79b8ff',
  onAccent: '#0d1117', // accent 底上的文字：深字（对比 7.5:1）——🔴-2 修复（白字仅 2.53:1 不达 AA）
  success: '#3fb950',
  warning: '#d29922',
  danger: '#f85149',
  info: '#58a6ff',

  /** 圆角 */
  radiusControl: '6px',
  radiusCard: '8px',
  radiusBadge: '999px',

  /** 焦点环 */
  focusRing: '0 0 0 2px rgba(88, 166, 255, 0.4)',

  /** 阴影（默认无，仅浮起态极淡） */
  shadowRaised: '0 4px 12px rgba(0, 0, 0, 0.3)',
} as const

/** 字号阶梯（收敛：页标题 24 / 正文 14 / 卡片标题 15 / 次要 13 / 元信息 12） */
export const typeScale = {
  pageTitle: { size: '24px', weight: 600, spacing: '-0.4px' },
  cardTitle: { size: '15px', weight: 500, spacing: '-0.2px' },
  body: { size: '14px', weight: 400, spacing: '0' },
  secondary: { size: '13px', weight: 400, spacing: '0' },
  meta: { size: '12px', weight: 400, spacing: '0' },
  eyebrow: { size: '13px', weight: 500, spacing: '+0.4px' }, // 唯一正字距（小标签）
  mono: { size: '13px', weight: 400, spacing: '0' }, // 代码/数字，配合 JetBrains Mono
} as const
