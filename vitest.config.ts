import { isAbsolute, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import * as ts from 'typescript'
import { defineConfig } from 'vitest/config'

const decoratorSyntax = /^\s*@[A-Za-z_$][\w$]*/m

function standardDecoratorPlugin() {
  return {
    name: 'dsh-standard-decorators',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      const file = id.split('?', 1)[0] ?? id
      if (!/\.[cm]?tsx?$/.test(file) || !decoratorSyntax.test(code)) return
      const result = ts.transpileModule(code, {
        fileName: file,
        compilerOptions: {
          target: ts.ScriptTarget.ES2024,
          module: ts.ModuleKind.ESNext,
          jsx: file.endsWith('x') ? ts.JsxEmit.ReactJSX : undefined,
          sourceMap: true,
        },
      })
      return {
        code: result.outputText.replace(/\n?\/\/# sourceMappingURL=.*$/u, '\n'),
        map: result.sourceMapText,
      }
    },
  }
}

const sharedIdentity = process.env.DSH_SHARED_IDENTITY_CHECKOUT
if (sharedIdentity && !isAbsolute(sharedIdentity)) throw new Error('DSH_SHARED_IDENTITY_CHECKOUT must be absolute')
const identityAliases = sharedIdentity ? {
  '@agent-network-protocol/dsh-anp-identity/provider-api': join(sharedIdentity, 'packages/dsh-anp-identity/src/provider-api.ts'),
  '@agent-network-protocol/dsh-anp-identity/provider': join(sharedIdentity, 'packages/dsh-anp-identity/src/provider.ts'),
  '@agent-network-protocol/dsh-anp-identity': join(sharedIdentity, 'packages/dsh-anp-identity/src/index.ts'),
  '@agent-network-protocol/anp-identity/provider': join(sharedIdentity, 'bindings/node/provider.js'),
  '@agent-network-protocol/anp-identity': join(sharedIdentity, 'bindings/node/index.js'),
} : {}

export default defineConfig({
  define: {
    __DSH_AWIKI_BUILTIN_TENANTS_JSON__: JSON.stringify(
      readFileSync(new URL('./config/builtin-tenants.default.json', import.meta.url), 'utf8'),
    ),
  },
  plugins: [standardDecoratorPlugin()],
  resolve: {
    alias: {
      ...identityAliases,
      '@deepseek-ai/dsh-client-ui-renderer/client': fileURLToPath(new URL('./tests/mocks/client-runtime.ts', import.meta.url)),
      '@deepseek-ai/dsh-client-ui-primitives': fileURLToPath(
        new URL('./tests/mocks/ui-primitives.tsx', import.meta.url),
      ),
    },
  },
  test: {
    pool: 'forks',
    include: ['tests/**/*.spec.{ts,tsx}'],
    exclude: ['tests/e2e/specs/**'],
    setupFiles: ['./tests/setup.ts'],
  },
})
