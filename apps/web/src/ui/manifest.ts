import type { UiContribution } from './contribution'

/**
 * 能力包 UI 清单 — 新增能力包时在此追加导入。
 * 对应后端 capabilities/<name>/ 目录，前后端插件一一对应。
 */
import { exampleUi } from '../capabilities/example/example.ui'

export const uiContributions: UiContribution[] = [exampleUi]
