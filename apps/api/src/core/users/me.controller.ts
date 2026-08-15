import { Body, Controller, ForbiddenException, Get, Param, Patch, Post } from '@nestjs/common'
import { UsersService } from './users.service'
import { Authorize, CurrentUser, type AuthUser } from '../permissions/permission.decorator'
import { ArrayMaxSize, IsArray, IsBoolean, IsOptional, IsString, Matches, MaxLength, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

class LinkDto {
  @IsString() @MaxLength(30) label!: string
  @IsString() @MaxLength(200) @Matches(/^https?:\/\//) url!: string
}

class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(30) nickname?: string
  @IsOptional() @IsString() @MaxLength(10) grade?: string
  @IsOptional() @IsString() @MaxLength(200) bio?: string
  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) skills?: string[]
  @IsOptional() @IsArray() @ArrayMaxSize(5) @ValidateNested({ each: true }) @Type(() => LinkDto) links?: LinkDto[]
  @IsOptional() @IsString() @MaxLength(300) avatarUrl?: string
  @IsOptional() @IsBoolean() allowMatch?: boolean
}

/** 我的资料 API（P1）— 仅本人 */
@Controller('me')
export class MeController {
  constructor(private readonly users: UsersService) {}

  /** 完整资料（本人视角，含内部字段） */
  @Authorize()
  @Get()
  async me(@CurrentUser() user: AuthUser) {
    return this.users.getInternal(user.id)
  }

  /** 更新资料 */
  @Authorize()
  @Patch()
  async update(@Body() dto: UpdateProfileDto, @CurrentUser() user: AuthUser) {
    return this.users.updateProfile(user.id, dto)
  }
}
