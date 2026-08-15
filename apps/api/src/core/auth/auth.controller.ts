import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AuthService, type LoginResult } from './auth.service'
import { Public, CurrentUser, type AuthUser } from '../permissions/permission.decorator'
import { IsEmail, IsString, MinLength } from 'class-validator'

class RegisterDto {
  @IsEmail() email!: string
  @IsString() @MinLength(8) password!: string
  @IsString() @MinLength(1) nickname!: string
  /** 邀请令牌 — 成员生命周期入口（部长发链接） */
  @IsString() @MinLength(10) inviteToken!: string
}

class LoginDto {
  @IsEmail() email!: string
  @IsString() password!: string
}

class RefreshDto {
  @IsString() @MinLength(10) refreshToken!: string
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** 注册：必须携带有效邀请令牌（角色由邀请决定） */
  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto): Promise<LoginResult> {
    return this.auth.register(dto.email, dto.password, dto.nickname, dto.inviteToken)
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto): Promise<LoginResult> {
    return this.auth.login(dto.email, dto.password)
  }

  /** refresh 轮换：旧 token 作废，签发新对 */
  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshDto): Promise<LoginResult> {
    return this.auth.refresh(dto.refreshToken)
  }

  /** 当前登录用户信息（受保护路由示例） */
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user
  }
}
