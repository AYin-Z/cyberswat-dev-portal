import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@cyberswat/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5175,
    proxy: {
      // 开发期 API 直连内核（生产由 nginx 反代）
      '/api': {
        target: 'http://127.0.0.1:8093',
        changeOrigin: true,
      },
    },
  },
})
