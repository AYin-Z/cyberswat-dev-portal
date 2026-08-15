import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common'
import { ModerationService, type TargetType } from './moderation.service'
import { Authorize, CurrentUser, type AuthUser } from '../permissions/permission.decorator'
import { IsEnum, IsString, MaxLength } from 'class-validator'

class ReportDto {
  @IsString() @MaxLength(200) reason!: string
}

/** 内容治理 API（P5） */
@Controller('moderation')
export class ModerationController {
  constructor(private readonly mod: ModerationService) {}

  /** 举报（所有登录成员） */
  @Authorize()
  @Post('report/:targetType/:targetId')
  report(
    @Param('targetType') targetType: TargetType,
    @Param('targetId') targetId: string,
    @Body() dto: ReportDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.mod.report(targetType, targetId, dto.reason, user.id)
  }

  /** 删除（作者本人或部长） */
  @Authorize()
  @Delete(':targetType/:targetId')
  remove(
    @Param('targetType') targetType: TargetType,
    @Param('targetId') targetId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.mod.remove(targetType, targetId, user.id, user.role)
  }

  /** 举报队列（部长） */
  @Authorize()
  @Get('reports')
  list(@CurrentUser() user: AuthUser) {
    return this.mod.listReports(user.role)
  }

  /** 处置：RESOLVED=删除 / DISMISSED=忽略 */
  @Authorize()
  @Post('reports/:id')
  resolve(
    @Param('id') id: string,
    @Query('action') action: 'RESOLVED' | 'DISMISSED',
    @CurrentUser() user: AuthUser,
  ) {
    return this.mod.resolveReport(id, action, user.id, user.role)
  }
}
