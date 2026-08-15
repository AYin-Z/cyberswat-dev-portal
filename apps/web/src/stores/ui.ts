import { defineStore } from 'pinia'
import { menu } from '../router'
import type { UiContribution } from '../ui/contribution'

/** UI 状态：菜单数据源（由能力包 manifest 组合而来） */
export const useUiStore = defineStore('ui', {
  state: () => ({
    menu: menu as NonNullable<UiContribution['menu']>,
  }),
})
