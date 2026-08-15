/**
 * 安全配置（🔴-4 修复）：JWT_SECRET 必须由环境提供，缺失/默认值直接拒绝启动。
 */
const KNOWN_DEFAULTS = new Set(['dev-secret-change-me', 'test-secret', 'secret'])

export function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32 || KNOWN_DEFAULTS.has(secret)) {
    throw new Error(
      'JWT_SECRET 未配置或为弱值（需 ≥32 字符强随机）。' +
        '生成：openssl rand -base64 48；然后设置环境变量后重启。',
    )
  }
  return secret
}
