import { Controller, Get, Param } from '@nestjs/common'
import { UsersService } from './users.service'
import { Public } from '../permissions/permission.decorator'
import type { PublicUserProfile } from '@cyberswat/shared'

/**
 * 成员主页 API — Vidar 卡片模式（PRD 构思 #2/#3）：
 * 头像/昵称/年级/方向/签名/外链，按年级分组。
 * 对外一律脱敏（PublicUserProfile）：姓名/区队/邮箱/角色 永不外泄。
 */
@Controller('members')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** 成员列表（脱敏，按年级分组由前端处理） */
  @Public()
  @Get()
  async list(): Promise<PublicUserProfile[]> {
    return this.users.listPublic()
  }

  /** 成员详情（脱敏） */
  @Public()
  @Get(':id')
  async detail(@Param('id') id: string): Promise<PublicUserProfile> {
    const user = await this.users.getInternal(id)
    return this.users.toPublic(user)
  }
}
