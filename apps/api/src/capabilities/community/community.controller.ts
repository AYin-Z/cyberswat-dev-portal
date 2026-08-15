import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { CommunityService } from './community.service'
import { Authorize, CurrentUser, type AuthUser } from '../../core/permissions/permission.decorator'
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator'
import { PostBoard } from '@prisma/client'

class CreatePostDto {
  @IsEnum(PostBoard) board!: PostBoard
  @IsString() @MinLength(2) title!: string
  @IsString() @MinLength(2) content!: string
}

class CommentDto {
  @IsString() @MinLength(1) content!: string
}

/** 社区 REST API */
@Controller('posts')
export class CommunityController {
  constructor(private readonly service: CommunityService) {}

  @Authorize('post.view')
  @Get()
  list(@Query('board') board?: PostBoard, @CurrentUser() user?: AuthUser) {
    return this.service.listPosts(user!.id, board)
  }

  @Authorize('post.view')
  @Get(':id')
  detail(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.postDetail(id, user.id)
  }

  @Authorize('post.create')
  @Post()
  create(@Body() dto: CreatePostDto, @CurrentUser() user: AuthUser) {
    return this.service.createPost(user.id, dto)
  }

  @Authorize('post.comment')
  @Post(':id/comments')
  comment(@Param('id') id: string, @Body() dto: CommentDto, @CurrentUser() user: AuthUser) {
    return this.service.addComment(id, user.id, dto.content)
  }

  @Authorize('post.comment')
  @Post(':id/like')
  like(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.toggleLike(id, user.id)
  }
}
