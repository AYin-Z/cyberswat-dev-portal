import type { GlobalThemeOverrides } from 'naive-ui'
import { tokens } from './tokens'

/**
 * Naive UI 主题覆盖 — dark-saas token 全量映射。
 * 组件只引用语义（n-button/n-card 等），色值集中在此。
 */
export const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: tokens.accent,
    primaryColorHover: tokens.accentHover,
    primaryColorPressed: tokens.accentHover,
    primaryColorSuppl: tokens.accentHover,
    successColor: tokens.success,
    warningColor: tokens.warning,
    errorColor: tokens.danger,
    infoColor: tokens.info,
    // 表面层级
    bodyColor: tokens.canvas,
    cardColor: tokens.surface1,
    modalColor: tokens.surface2,
    popoverColor: tokens.surface2,
    tableColor: tokens.surface1,
    tableHeaderColor: tokens.surface2,
    hoverColor: tokens.surface3,
    actionColor: tokens.surface2,
    // 文字
    textColorBase: tokens.ink,
    textColor1: tokens.ink,
    textColor2: tokens.inkMuted,
    textColor3: tokens.inkSubtle,
    textColorDisabled: tokens.inkTertiary,
    placeholderColor: tokens.inkTertiary,
    // 边框
    borderColor: tokens.hairline,
    dividerColor: tokens.hairline,
    // 圆角与焦点
    borderRadius: tokens.radiusControl,
    borderRadiusSmall: '4px',
    // 阴影克制
    boxShadow1: tokens.shadowRaised,
    boxShadow2: tokens.shadowRaised,
    boxShadow3: tokens.shadowRaised,
    // 字体
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    fontFamilyMono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  },
  Button: {
    borderRadiusMedium: '8px',
    borderRadiusSmall: '8px',
    fontWeight: '500',
    // 🔴-2 对比度修复：实心底（primary/success/warning/error）统一深色文字，
    // 白字 on #58a6ff 仅 2.53:1、on #3fb950 2.54:1、on #f85149 3.35:1 均不达 AA；
    // 深字 #0d1117 在四色上 5.7~7.6:1（Linear 式「亮底深字」风格，accent 色值零改动）
    textColorPrimary: '#0d1117',
    textColorHoverPrimary: '#0d1117',
    textColorPressedPrimary: '#0d1117',
    textColorFocusPrimary: '#0d1117',
    textColorPrimarySuccess: '#0d1117',
    textColorHoverPrimarySuccess: '#0d1117',
    textColorPressedPrimarySuccess: '#0d1117',
    textColorPrimaryError: '#0d1117',
    textColorHoverPrimaryError: '#0d1117',
    textColorPressedPrimaryError: '#0d1117',
    textColorPrimaryWarning: '#0d1117',
    textColorHoverPrimaryWarning: '#0d1117',
    textColorPressedPrimaryWarning: '#0d1117',
    textColorSecondary: tokens.ink,
    borderSecondary: `1px solid ${tokens.hairline}`,
    borderHoverSecondary: `1px solid ${tokens.hairlineStrong}`,
  },
  Card: {
    borderRadius: tokens.radiusCard,
    borderColor: tokens.hairline,
    color: tokens.surface1,
  },
  Input: {
    borderRadius: tokens.radiusControl,
    color: tokens.surface1,
    border: `1px solid ${tokens.hairline}`,
    borderHover: `1px solid ${tokens.hairlineStrong}`,
    borderFocus: `1px solid ${tokens.accent}`,
    boxShadowFocus: tokens.focusRing,
  },
  Select: {
    peers: {
      InternalSelection: {
        color: tokens.surface1,
        border: `1px solid ${tokens.hairline}`,
        borderHover: `1px solid ${tokens.hairlineStrong}`,
        borderFocus: `1px solid ${tokens.accent}`,
        boxShadowFocus: tokens.focusRing,
      },
    },
  },
  Tag: {
    borderRadius: tokens.radiusBadge,
  },
  Layout: {
    color: tokens.canvas,
    siderColor: tokens.surface1,
    headerColor: tokens.canvas,
    siderBorderColor: tokens.hairline,
    headerBorderColor: tokens.hairline,
  },
  Menu: {
    itemColorActive: tokens.surface3,
    itemTextColorActive: tokens.ink,
    itemTextColor: tokens.inkMuted,
    itemIconColor: tokens.inkSubtle,
    itemIconColorActive: tokens.accent,
    itemBorderRadius: '6px',
    itemHeight: '38px',
  },
  Badge: {
    color: tokens.danger,
  },
  Notification: {
    borderRadius: tokens.radiusCard,
    color: tokens.surface2,
    borderColor: tokens.hairline,
  },
  DataTable: {
    thColor: tokens.surface2,
    tdColor: tokens.surface1,
    borderColor: tokens.hairline,
    thTextColor: tokens.inkMuted,
    tdTextColor: tokens.ink,
  },
  Empty: {
    iconColor: tokens.inkTertiary,
    textColor: tokens.inkSubtle,
  },
  Skeleton: {
    color: tokens.surface2,
    colorEnd: tokens.surface3,
  },
  Modal: {
    color: tokens.surface2,
    borderColor: tokens.hairline,
  },
  Popover: {
    color: tokens.surface2,
    borderColor: tokens.hairline,
  },
  Dropdown: {
    color: tokens.surface2,
    optionColorHover: tokens.surface3,
  },
  Timeline: {
    lineColor: tokens.hairline,
    titleTextColor: tokens.ink,
    metaTextColor: tokens.inkSubtle,
  },
  Tooltip: {
    color: tokens.surface4,
  },
}
