import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@deepseek-ai/dsh-client-runtime/client': fileURLToPath(
        new URL('../../tests/mocks/client-runtime.ts', import.meta.url),
      ),
      '@deepseek-ai/dsh-client-ui-primitives': fileURLToPath(
        new URL('../../tests/mocks/ui-primitives.tsx', import.meta.url),
      ),
    },
  },
  test: {
    pool: 'forks',
    include: ['tests/**/*.spec.{ts,tsx}'],
    setupFiles: ['../../tests/setup.ts'],
  },
})
