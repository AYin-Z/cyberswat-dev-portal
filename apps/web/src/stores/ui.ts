import { defineStore } from 'pinia'
import { menu } from '../router'

/** UI 状态：菜单数据源（由能力包 manifest 组合而来） */
export const useUiStore = defineStore('ui', {
  state: () => ({
    menu: menu as { path: string; label: string }[],
  }),
})
