import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { AnnouncementService, type AnnouncementView } from './announcement.service'
import { Authorize, CurrentUser, type AuthUser } from '../../core/permissions/permission.decorator'
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator'

class PublishDto {
  @IsString() @MinLength(1) title!: string
  @IsString() @MinLength(1) content!: string
  @IsOptional() @IsBoolean() important?: boolean
}

/** 公告 REST API — 人工通道（agent 走 ToolRegistry 审批通道） */
@Controller('announcements')
export class AnnouncementController {
  constructor(private readonly service: AnnouncementService) {}

  /** 列表（含当前用户已读/确认状态） */
  @Authorize('announcement.view')
  @Get()
  list(
    @Query('importantOnly') importantOnly?: string,
    @CurrentUser() user?: AuthUser,
  ): Promise<AnnouncementView[]> {
    return this.service.list(user!.id, { importantOnly: importantOnly === 'true' })
  }

  /** 详情（🟢-13：GET 无副作用，不再自动标记已读） */
  @Authorize('announcement.view')
  @Get(':id')
  detail(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.detail(id, user.id)
  }

  /** 显式标记已读（浏览器预取/爬虫不会污染统计） */
  @Authorize('announcement.view')
  @Post(':id/read')
  read(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<AnnouncementView> {
    return this.service.markRead(id, user.id, false)
  }

  /** 重要公告确认收到 */
  @Authorize('announcement.view')
  @Post(':id/confirm')
  confirm(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<AnnouncementView> {
    return this.service.markRead(id, user.id, true)
  }

  /** 发布（dept-leader/admin） */
  @Authorize('announcement.publish')
  @Post()
  publish(@Body() dto: PublishDto, @CurrentUser() user: AuthUser): Promise<AnnouncementView> {
    return this.service.publish(user.id, dto)
  }

  /** 已读/未读名单 + 统计（部长视角，信息触达核心） */
  @Authorize('announcement.readers')
  @Get(':id/readers')
  readers(@Param('id') id: string) {
    return this.service.stats(id)
  }
}
