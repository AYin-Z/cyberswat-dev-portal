import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { NotificationGateway } from './notification.gateway'

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  providers: [NotificationGateway],
  exports: [NotificationGateway],
})
export class GatewayModule {}
