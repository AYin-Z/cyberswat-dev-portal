import { defineConfig } from 'vitest/config'
import swc from 'unplugin-swc'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [swc.vite({ tsconfigFile: './tsconfig.json' })],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@cyberswat/shared': fileURLToPath(
        new URL('../../packages/shared/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.spec.ts'],
    testTimeout: 30000,
    hookTimeout: 60000,
    // e2e 测试隔离库（cyberswat_test）与环境变量：仅本地开发/CI 使用，非生产凭证。
    // 生产 JWT_SECRET/DB 密码存于宿主 ~/.cyberswat-dev-prod.env（600），不入库。
    env: {
      DATABASE_URL: 'postgresql://cyberswat:cyberswat@127.0.0.1:5433/cyberswat_test?schema=public',
      JWT_SECRET: 'dev-only-test-jwt-secret-0123456789abcdef0123456789',
    },
  },
})
