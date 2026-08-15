import { defineConfig } from 'vitest/config'
import swc from 'unplugin-swc'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [swc.vite({ tsconfigFile: './tsconfig.json' })],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@cyberswat/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.spec.ts'],
    testTimeout: 30000,
    hookTimeout: 60000,
  },
})
