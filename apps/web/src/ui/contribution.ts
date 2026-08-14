import type { Component } from 'vue'

/**
 * UI 贡献点 — 前端插件化契约。
 * 能力包前端模块导出 UiContribution，框架在启动时组合（对应 DSH __DSH_BOOT__ 组合生成）。
 * 纪律：静态组合（构建期），禁止运行时加载远程组件。
 */

export interface UiContribution {
  /** 插件 id（与后端 PluginManifest.id 对齐，如 dev.example） */
  pluginId: string
  /** 菜单项（按序合并进全局菜单） */
  menu?: { path: string; label: string }[]
  /** 路由表（path 必须带插件前缀避免冲突） */
  routes?: {
    path: string
    name: string
    component: Component
  }[]
  /** 首页卡片插槽（home.cards 等具名插槽） */
  slots?: Record<string, Component>
}

/** 组合器：收集全部能力包的 UI 声明 */
export function composeUi(contributions: UiContribution[]) {
  const menu: UiContribution['menu'] = []
  const routes: NonNullable<UiContribution['routes']> = []
  const slots: Record<string, Component> = {}

  for (const c of contributions) {
    if (c.menu) menu.push(...c.menu)
    if (c.routes) routes.push(...c.routes)
    if (c.slots) Object.assign(slots, c.slots)
  }
  return { menu, routes, slots }
}
