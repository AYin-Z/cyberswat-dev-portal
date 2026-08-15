import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { GithubAuthController } from './github-auth.controller'
import { requireJwtSecret } from '../config'
import { JwtStrategy } from './jwt.strategy'

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: requireJwtSecret(),
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController, GithubAuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
