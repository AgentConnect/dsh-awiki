import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import hostConfig from '../../vitest.config.ts'

export default defineConfig({
  define: hostConfig.define,
  plugins: hostConfig.plugins,
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
