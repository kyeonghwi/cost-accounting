import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // @AX:NOTE [AUTO] coverage scope intentionally limited to lib/; app/ components tested via Playwright only
      include: ['lib/**/*.ts'],
      exclude: ['lib/utils.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
