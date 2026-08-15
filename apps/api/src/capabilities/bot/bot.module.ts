import { Module, OnModuleInit } from '@nestjs/common'
import { DevAssistantBot } from './dev-assistant.service'

@Module({
  providers: [DevAssistantBot],
  exports: [DevAssistantBot],
})
export class BotModule implements OnModuleInit {
  constructor(private readonly bot: DevAssistantBot) {}

  async onModuleInit() {
    await this.bot.ensure()
  }
}
