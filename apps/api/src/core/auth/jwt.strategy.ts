import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { requireJwtSecret } from '../config'
import type { Role } from '@cyberswat/shared'
import type { AuthUser } from '../permissions/permission.decorator'

interface JwtPayload {
  sub: string
  role: Role
  nickname: string
}

/** JWT 策略 — 从 Authorization: Bearer 提取并注入 request.user */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: requireJwtSecret(),
    })
  }

  validate(payload: JwtPayload & { aud?: string | string[] }): AuthUser {
    // 🟡-20：OAuth MCP access token（aud=mcp）不得访问站点 API
    const aud = payload.aud
    const auds = Array.isArray(aud) ? aud : [aud]
    if (auds.includes('mcp')) {
      throw new UnauthorizedException('MCP 令牌不能访问站点 API')
    }
    return { id: payload.sub, role: payload.role, nickname: payload.nickname }
  }
}
