import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { IdeaService, type IdeaView } from './idea.service'
import { Authorize, CurrentUser, type AuthUser } from '../../core/permissions/permission.decorator'
import { IsArray, IsEnum, IsOptional, IsString, MinLength } from 'class-validator'
import { IdeaStatus } from '@prisma/client'

class CreateIdeaDto {
  @IsString() @MinLength(2) title!: string
  @IsString() @MinLength(5) description!: string
  @IsString() @MinLength(2) need!: string
  @IsOptional() @IsArray() @IsString({ each: true }) techStack?: string[]
}

class JoinDto {
  @IsOptional() @IsString() message?: string
}

/** 点子墙 REST API */
@Controller('ideas')
export class IdeaController {
  constructor(private readonly service: IdeaService) {}

  @Authorize('idea.view')
  @Get()
  list(
    @Query('status') status?: IdeaStatus,
    @Query('tech') tech?: string,
    @CurrentUser() user?: AuthUser,
  ): Promise<IdeaView[]> {
    return this.service.list(user!.id, { status, tech })
  }

  @Authorize('idea.view')
  @Get(':id')
  detail(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.detail(id, user.id)
  }

  @Authorize('idea.post')
  @Post()
  create(@Body() dto: CreateIdeaDto, @CurrentUser() user: AuthUser): Promise<IdeaView> {
    return this.service.create(user.id, dto)
  }

  @Authorize('idea.join')
  @Post(':id/join')
  join(@Param('id') id: string, @Body() dto: JoinDto, @CurrentUser() user: AuthUser) {
    return this.service.join(id, user.id, dto.message)
  }

  @Authorize('idea.join')
  @Post(':id/leave')
  leave(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.leave(id, user.id)
  }

  /** 转正/归档（部长） */
  @Authorize('idea.promote')
  @Post(':id/status')
  setStatus(@Param('id') id: string, @Body('status') status: IdeaStatus, @CurrentUser() user: AuthUser): Promise<IdeaView> {
    return this.service.setStatus(id, status, user.id)
  }
}
