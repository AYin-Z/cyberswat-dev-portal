import { Controller, Post, Body, Get, UseGuards, Res } from '@nestjs/common'

import type { Response } from 'express'
import { AuthGuard } from '@nestjs/passport'
import { AuthService, type LoginResult } from './auth.service'
import { Public, CurrentUser, type AuthUser } from '../permissions/permission.decorator'
import { IsEmail, IsString, MinLength } from 'class-validator'
/** 种会话 cookie（OAuth authorize 需要浏览器会话；httpOnly + SameSite=Lax） */
function setSessionCookie(res: Response, accessToken: string) {
  res.cookie('cs_session', accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production', // 🟢-10：生产 https 强制 secure
    maxAge: 15 * 60 * 1000,
    path: '/',
  })
}

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
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response): Promise<LoginResult> {
    const result = await this.auth.register(dto.email, dto.password, dto.nickname, dto.inviteToken)
    setSessionCookie(res, result.accessToken)
    return result
  }

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response): Promise<LoginResult> {
    const result = await this.auth.login(dto.email, dto.password)
    setSessionCookie(res, result.accessToken)
    return result
  }

  /** refresh 轮换：旧 token 作废，签发新对 */
  @Public()
  @Post('refresh')
  async refresh(@Body() dto: RefreshDto, @Res({ passthrough: true }) res: Response): Promise<LoginResult> {
    const result = await this.auth.refresh(dto.refreshToken)
    setSessionCookie(res, result.accessToken)
    return result
  }

  /** 当前登录用户信息（受保护路由示例） */
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user
  }
}
