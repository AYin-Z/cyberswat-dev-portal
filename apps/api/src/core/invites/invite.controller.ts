import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import { InviteService, type InviteView } from './invite.service'
import { Authorize, CurrentUser, type AuthUser } from '../permissions/permission.decorator'
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator'
import { CoreRole } from '@prisma/client'

class CreateInviteDto {
  @IsOptional() @IsEnum(CoreRole) role?: CoreRole
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
