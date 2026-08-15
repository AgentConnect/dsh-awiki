import { existsSync, readFileSync } from 'node:fs'
import { basename, dirname, resolve as resolvePath, sep } from 'node:path'
import type { Plugin } from 'rolldown'
import { defineConfig } from 'tsdown'
import { transform } from 'lightningcss'

const PACKAGE_ID = 'dsh-awiki'
const CSS_VIRTUAL_PREFIX = '\0dsh-awiki-css:'
const CSS_VIRTUAL_SUFFIX = '.mjs'

const CLIENT_EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-runtime/client',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
] as const

function sourceAssetPath(source: string, importer: string): string {
  const emitted = resolvePath(dirname(importer), source)
  if (existsSync(emitted)) return emitted
  const marker = `${sep}lib${sep}types${sep}`
  const boundary = emitted.indexOf(marker)
  if (boundary < 0) return emitted
  return resolvePath(emitted.slice(0, boundary), 'src', emitted.slice(boundary + marker.length))
}

function cssModulesPlugin(): Plugin {
  const sourceFiles = new Map<string, string>()
  return {
    name: 'dsh-awiki-css-modules-inline',
    resolveId(source, importer) {
      if (!source.endsWith('.module.css')) return null
      const absolute = importer === undefined ? source : sourceAssetPath(source, importer)
      const virtualId = CSS_VIRTUAL_PREFIX + basename(absolute) + CSS_VIRTUAL_SUFFIX
      sourceFiles.set(virtualId, absolute)
      return virtualId
    },
    load(virtualId) {
      if (!virtualId.startsWith(CSS_VIRTUAL_PREFIX)) return null
      const filename = sourceFiles.get(virtualId)
      if (filename === undefined) throw new Error(`missing CSS module source for ${virtualId}`)
      const assetName = basename(filename)
      this.addWatchFile(filename)
      const result = transform({
        filename: `${PACKAGE_ID}/${assetName}`,
        code: readFileSync(filename),
        cssModules: { pattern: '[hash]_[local]' },
        minify: true,
      })
      const classMap: Record<string, string> = {}
      for (const [local, value] of Object.entries(result.exports ?? {}).sort(([left], [right]) => left.localeCompare(right))) {
        classMap[local] = value.name
      }
      const tagId = `${PACKAGE_ID}/${assetName}`
      return [
        `const css = ${JSON.stringify(result.code.toString())};`,
        `const tagId = ${JSON.stringify(tagId)};`,
        'if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {',
        '  const tag = document.createElement("style");',
        `  tag.dataset.plugin = ${JSON.stringify(PACKAGE_ID)};`,
        '  tag.dataset.pluginCss = tagId;',
        '  tag.textContent = css;',
        '  document.head.appendChild(tag);',
        '}',
        `export default ${JSON.stringify(classMap)};`,
      ].join('\n')
    },
  }
}

export default defineConfig([
  {
    name: PACKAGE_ID,
    entry: {
      index: 'lib/types/index.js',
      provider: 'lib/types/provider.js',
      'summary-provider': 'lib/types/summary-provider.js',
      invariant: 'lib/types/invariant.js',
    },
    outDir: 'lib',
    format: 'esm',
    platform: 'node',
    target: 'es2024',
    clean: false,
    dts: false,
    external: [/^node:/, /^@deepseek-ai\//],
    outputOptions: {
      entryFileNames: '[name].js',
    },
  },
  {
    name: `${PACKAGE_ID}/client`,
    entry: { client: 'lib/types/client/index.js' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    target: 'es2022',
    clean: false,
    dts: false,
    sourcemap: true,
    external: [...CLIENT_EXTERNALS],
    noExternal: id => CLIENT_EXTERNALS.includes(id as typeof CLIENT_EXTERNALS[number]) ? undefined : true,
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
      'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV ?? 'production'),
      'import.meta.env': JSON.stringify({ MODE: process.env.NODE_ENV ?? 'production' }),
    },
    plugins: [cssModulesPlugin()],
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PACKAGE_ID)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
])
