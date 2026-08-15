import type { UiContribution } from './contribution'

/**
 * 能力包 UI 清单 — 新增能力包时在此追加导入。
 * 对应后端 capabilities/<name>/ 目录（或内核 core/* 能力），前后端插件一一对应。
 */
import { exampleUi } from '../capabilities/example/example.ui'
import { announcementUi } from '../capabilities/announcement/announcement.ui'
import { invitesUi } from '../capabilities/invites/invites.ui'
import { ideaUi } from '../capabilities/idea-wall/idea.ui'
import { membersUi } from '../capabilities/members/members.ui'

export const uiContributions: UiContribution[] = [exampleUi, announcementUi, invitesUi, ideaUi, membersUi]
