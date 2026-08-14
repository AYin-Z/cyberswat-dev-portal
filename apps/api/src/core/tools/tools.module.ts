import { Global, Module } from '@nestjs/common'
import { ToolRegistry } from './tool.registry'
import { ToolsController } from './tools.controller'

@Global()
@Module({
  controllers: [ToolsController],
  providers: [ToolRegistry],
  exports: [ToolRegistry],
})
export class ToolsModule {}
