import { defineConfig } from 'tsdown'

export default defineConfig({
  name: '@awiki/dsh-model-proxy',
  entry: { index: 'lib/types/index.js' },
  outDir: 'lib',
  format: 'esm',
  platform: 'node',
  target: 'es2024',
  clean: false,
  dts: false,
  external: [/^node:/, /^@awiki\//, /^@deepseek-ai\//],
  outputOptions: {
    entryFileNames: '[name].js',
  },
})
