import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  root: fileURLToPath(new URL('./vendor/anp-typescript-sdk/', import.meta.url)),
  test: {
    pool: 'forks',
    include: ['tests/im-client.test.ts', 'tests/im-proof.test.ts', 'tests/im-storage.test.ts'],
  },
})
