import { Controller, Get, Param, Post } from '@nestjs/common'
import { NotificationService } from './notification.service'
import { Authorize, CurrentUser, type AuthUser } from '../permissions/permission.decorator'

/** 通知 API（socket.io 之外的轮询兜底 + 已读操作） */
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notifications: NotificationService) {}

  @Authorize('notification.view')
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.notifications.listFor(user.id)
  }

  @Authorize('notification.view')
  @Get('unread-count')
  unread(@CurrentUser() user: AuthUser) {
    return this.notifications.unreadCount(user.id)
  }

  @Authorize('notification.view')
  @Post('read')
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notifications.markRead(user.id)
  }

  @Authorize('notification.view')
  @Post('read/:id')
  markRead(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.notifications.markRead(user.id, id)
  }
}
