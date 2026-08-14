import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AuthService, type LoginResult } from './auth.service'
import { Public, CurrentUser, type AuthUser } from '../permissions/permission.decorator'
import { IsEmail, IsString, MinLength } from 'class-validator'

class RegisterDto {
  @IsEmail() email!: string
  @IsString() @MinLength(8) password!: string
  @IsString() @MinLength(1) nickname!: string
}

class LoginDto {
  @IsEmail() email!: string
  @IsString() password!: string
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto): Promise<LoginResult> {
    return this.auth.register(dto.email, dto.password, dto.nickname)
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto): Promise<LoginResult> {
    return this.auth.login(dto.email, dto.password)
  }

  /** 当前登录用户信息（受保护路由示例） */
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user
  }
}
