import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { requireJwtSecret } from '../config'
import { NotificationGateway } from './notification.gateway'

@Module({
  imports: [
    JwtModule.register({
      secret: requireJwtSecret(),
      signOptions: { expiresIn: '15m' },
    }),
  ],
  providers: [NotificationGateway],
  exports: [NotificationGateway],
})
export class GatewayModule {}
