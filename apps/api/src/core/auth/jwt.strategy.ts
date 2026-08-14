import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
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
      secretOrKey: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    })
  }

  validate(payload: JwtPayload): AuthUser {
    return { id: payload.sub, role: payload.role, nickname: payload.nickname }
  }
}
