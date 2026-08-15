import { Body, Controller, ForbiddenException, Get, Param, Post } from '@nestjs/common'
import { InviteService, type InviteView } from './invite.service'
import { Authorize, CurrentUser, type AuthUser } from '../permissions/permission.decorator'
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { CoreRole } from '@prisma/client'

class CreateInviteDto {
  @IsOptional() @IsEnum(CoreRole) role?: CoreRole
  @IsOptional() @IsString() createdByRole?: string // 注入当前用户角色
  @IsOptional() @IsInt() @Min(1) @Max(30) expiresInDays?: number
  @IsOptional() @IsInt() @Min(1) @Max(100) maxUses?: number
}

/** 邀请管理 API — 仅 dept-leader/admin */
@Controller('invites')
export class InviteController {
  constructor(private readonly invites: InviteService) {}

  @Authorize('invite.create')
  @Post()
  create(@Body() dto: CreateInviteDto, @CurrentUser() user: AuthUser) {
    // 🔴-7：角色白名单——非 admin 只能邀请普通成员（防提权）
    if (dto.role && dto.role !== 'MEMBER' && user.role !== 'admin') {
      throw new ForbiddenException('仅管理员可创建干部邀请')
    }
    return this.invites.create({
      createdBy: user.id,
      role: dto.role,
      expiresInDays: dto.expiresInDays,
      maxUses: dto.maxUses,
    })
  }

  @Authorize('invite.list')
  @Get()
  list(): Promise<InviteView[]> {
    return this.invites.list()
  }

  @Authorize('invite.list')
  @Post(':id/revoke')
  revoke(@Param('id') id: string): Promise<InviteView> {
    return this.invites.revoke(id)
  }
}
