import { Controller, Get, Query, Res, BadRequestException } from '@nestjs/common'
import type { Response } from 'express'
import { AuthService } from './auth.service'
import { Public } from '../permissions/permission.decorator'

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize'
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'
const GITHUB_API_USER = 'https://api.github.com/user'

/**
 * GitHub OAuth 二级认证（PRD 构思 #1 拍板：邮箱主 + GitHub 二级）。
 * 配置：GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET（.env，见 .env.example）。
 * 流程：/github/login 跳转授权 → 回调 /github/callback 交换 token → 登录/绑定 → 回前端。
 */
@Controller('auth/github')
export class GithubAuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Get('login')
  login(@Res() res: Response) {
    const clientId = process.env.GITHUB_CLIENT_ID
    if (!clientId) throw new BadRequestException('GitHub OAuth 未配置（GITHUB_CLIENT_ID）')
    const redirectUri = `${this.baseUrl()}/api/auth/github/callback`
    const url = `${GITHUB_AUTH_URL}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user user:email`
    res.redirect(url)
  }

  @Public()
  @Get('callback')
  async callback(@Query('code') code: string | undefined, @Res() res: Response) {
    if (!code) throw new BadRequestException('缺少授权码')
    const clientId = process.env.GITHUB_CLIENT_ID
    const clientSecret = process.env.GITHUB_CLIENT_SECRET
    if (!clientId || !clientSecret) throw new BadRequestException('GitHub OAuth 未配置')

    // 1. 交换 access token
    const tokenRes = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${this.baseUrl()}/api/auth/github/callback`,
      }),
    })
    const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string }
    if (!tokenData.access_token) throw new BadRequestException(`GitHub 授权失败: ${tokenData.error ?? 'unknown'}`)

    // 2. 获取用户信息
    const userRes = await fetch(GITHUB_API_USER, {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/json' },
    })
    const gh = (await userRes.json()) as {
      id: number
      login: string
      email: string | null
      name: string | null
      avatar_url?: string
    }

    // 3. 登录/绑定
    const result = await this.auth.githubLogin(
      String(gh.id),
      gh.login,
      gh.email,
      gh.name ?? gh.login,
      gh.avatar_url,
      tokenData.access_token,
    )

    // 4. 回前端（token 通过 URL fragment 传递，避免服务端日志泄漏）
    const frontendOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5175'
    res.redirect(`${frontendOrigin}/login?token=${result.accessToken}`)
  }

  private baseUrl(): string {
    return process.env.PUBLIC_API_URL ?? 'http://127.0.0.1:8093'
  }
}
