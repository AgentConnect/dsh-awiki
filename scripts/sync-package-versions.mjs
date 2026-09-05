import { readFileSync, writeFileSync } from 'node:fs'

const check = process.argv.includes('--check')
function packageVersion(manifestUrl) {
  const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8'))
  if (typeof manifest.version !== 'string' || manifest.version.trim() === '') {
    throw new Error(`package manifest has no version: ${manifestUrl.pathname}`)
  }
  return manifest.version
}

const pluginVersion = packageVersion(new URL('../package.json', import.meta.url))
const modelProxyVersion = packageVersion(new URL('../packages/dsh-model-proxy/package.json', import.meta.url))
const targets = [
  {
    output: new URL('../src/package-version.generated.ts', import.meta.url),
    exports: [
      ['DSH_AWIKI_PACKAGE_VERSION', pluginVersion],
      ['DSH_AWIKI_MODEL_PROXY_PACKAGE_VERSION', modelProxyVersion],
    ],
  },
  {
    output: new URL('../packages/dsh-model-proxy/src/package-version.generated.ts', import.meta.url),
    exports: [['DSH_AWIKI_MODEL_PROXY_PACKAGE_VERSION', modelProxyVersion]],
  },
]

for (const target of targets) {
  const expected = [
    '/** Generated from package.json by scripts/sync-package-versions.mjs. */',
    ...target.exports.map(([name, version]) => `export const ${name} = ${JSON.stringify(version)} as const`),
    '',
  ].join('\n')
  if (check) {
    if (readFileSync(target.output, 'utf8') !== expected) {
      throw new Error(`generated package version is stale: ${target.output.pathname}`)
    }
  } else {
    writeFileSync(target.output, expected)
  }
}

console.log(`package versions ${check ? 'verified' : 'synchronized'}`)
