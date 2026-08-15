import { Global, Module } from '@nestjs/common'
import { InviteService } from './invite.service'
import { InviteController } from './invite.controller'

@Global()
@Module({
  controllers: [InviteController],
  providers: [InviteService],
  exports: [InviteService],
})
export class InvitesModule {}
