import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { ProjectService, type ProjectView, type TaskView } from './project.service'
import { Authorize, CurrentUser, type AuthUser } from '../../core/permissions/permission.decorator'
import { IsEnum, IsISO8601, IsOptional, IsString, MinLength } from 'class-validator'
import { TaskPriority, TaskStatus } from '@prisma/client'

class CreateTaskDto {
  @IsString() @MinLength(2) title!: string
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsString() assigneeId?: string
  @IsOptional() @IsEnum(TaskPriority) priority?: TaskPriority
  @IsOptional() @IsISO8601() dueAt?: string
  @IsOptional() @IsString() projectId?: string
}

class PromoteDto {
  @IsOptional() @IsString() name?: string
  @IsOptional() @IsString() difficulty?: string
  @IsOptional() @IsString() repoUrl?: string
}

class ReviewDto {
  @IsString() note?: string
}

/** 项目与任务 REST API */
@Controller()
export class ProjectController {
  constructor(private readonly service: ProjectService) {}

  // ============ 项目 ============

  @Authorize('project.view')
  @Get('projects')
  listProjects(): Promise<ProjectView[]> {
    return this.service.listProjects()
  }

  @Authorize('project.view')
  @Get('projects/:id')
  projectDetail(@Param('id') id: string) {
    return this.service.projectDetail(id)
  }

  /** 点子转正 → 创建项目（部长） */
  @Authorize('project.promote')
  @Post('ideas/:ideaId/promote')
  promote(@Param('ideaId') ideaId: string, @Body() dto: PromoteDto, @CurrentUser() user: AuthUser) {
    return this.service.promoteIdea(ideaId, user.id, dto)
  }

  @Authorize('project.manage')
  @Post('projects/:id/members')
  addMember(@Param('id') id: string, @Body('userId') userId: string) {
    return this.service.addMember(id, userId)
  }

  // ============ 任务 ============

  @Authorize('task.view')
  @Get('tasks')
  listTasks(
    @Query('status') status?: TaskStatus,
    @Query('assigneeId') assigneeId?: string,
    @Query('projectId') projectId?: string,
  ): Promise<TaskView[]> {
    return this.service.listTasks({ status, assigneeId, projectId })
  }

  @Authorize('task.assign')
  @Post('tasks')
  createTask(@Body() dto: CreateTaskDto, @CurrentUser() user: AuthUser): Promise<TaskView> {
    return this.service.create(user.id, {
      title: dto.title,
      description: dto.description,
      assigneeId: dto.assigneeId,
      priority: dto.priority,
      dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      projectId: dto.projectId,
    })
  }

  @Authorize('task.work')
  @Post('tasks/:id/claim')
  claim(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<TaskView> {
    return this.service.claim(id, user.id)
  }

  @Authorize('task.work')
  @Post('tasks/:id/submit')
  submit(@Param('id') id: string, @Body() dto: ReviewDto, @CurrentUser() user: AuthUser): Promise<TaskView> {
    return this.service.submit(id, user.id, dto.note)
  }

  @Authorize('task.assign')
  @Post('tasks/:id/review')
  review(
    @Param('id') id: string,
    @Body('approve') approve: boolean,
    @CurrentUser() user: AuthUser,
  ): Promise<TaskView> {
    return this.service.review(id, user.id, approve === true)
  }
}
