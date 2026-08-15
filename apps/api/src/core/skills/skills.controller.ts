import { Controller, Get } from '@nestjs/common'
import { SkillsService } from './skills.service'
import { Authorize } from '../permissions/permission.decorator'

/** 技能词表 API（P1：资料页选择器数据源） */
@Controller('skills')
export class SkillsController {
  constructor(private readonly skills: SkillsService) {}

  @Authorize()
  @Get()
  list() {
    return this.skills.list()
  }
}
