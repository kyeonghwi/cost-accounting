import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: ['.claude/**', 'node_modules/**', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // @AX:NOTE [AUTO] coverage scope intentionally limited to lib/; app/ components tested via Playwright only
      include: ['lib/**/*.ts'],
      // runner.ts / runner.queries.ts are DB persistence layer requiring live PostgreSQL — excluded from unit coverage
      exclude: ['lib/utils.ts', 'lib/allocation/runner.ts', 'lib/allocation/runner.queries.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
