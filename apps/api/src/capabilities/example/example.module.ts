import { Module } from '@nestjs/common'
import { ExampleCapability } from './example.capability'

/** 能力包模块 — 照此模式新建 capabilities/<name>/ 目录 */
@Module({
  providers: [ExampleCapability],
})
export class ExampleModule {}
