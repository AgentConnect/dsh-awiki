import { readdir, readFile, stat } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'
import { spawnSync } from 'node:child_process'

const textExtensions = new Set(['.css', '.html', '.js', '.json', '.log', '.md', '.txt', '.xml', '.yaml', '.yml'])
const maximumArtifactBytes = 64 * 1024 * 1024

export interface SecretScanResult {
  readonly filesScanned: number
  readonly hits: readonly string[]
}

function secretPatterns(exactSecrets: readonly string[]): readonly RegExp[] {
  const escaped = exactSecrets.filter(value => value !== '').map(value => (
    new RegExp(value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u')
  ))
  return [
    ...escaped,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
    /authorization\s*[:=]\s*bearer\s+[A-Za-z0-9._~+\/-]+/iu,
    /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/u,
    /["'](?:otp|sas|token|privateKey|private_key)["']\s*[:=]\s*["'][^"']+["']/iu,
    /\+[1-9][0-9]{7,14}/u,
  ]
}

function inspectText(label: string, source: string, patterns: readonly RegExp[]): string[] {
  return patterns.some(pattern => pattern.test(source)) ? [label] : []
}

function zipEntries(path: string): string[] {
  const result = spawnSync('unzip', ['-Z1', path], { encoding: 'utf8', timeout: 10_000 })
  if (result.status !== 0) throw new Error('DSH E2E artifact ZIP inventory failed')
  return result.stdout.split(/\r?\n/u).filter(Boolean)
}

function readZipEntry(path: string, entry: string): string {
  const result = spawnSync('unzip', ['-p', path, entry], {
    encoding: 'utf8',
    timeout: 10_000,
    maxBuffer: maximumArtifactBytes,
  })
  if (result.status !== 0) throw new Error('DSH E2E artifact ZIP read failed')
  return result.stdout
}

export async function scanArtifacts(root: string, exactSecrets: readonly string[] = []): Promise<SecretScanResult> {
  const patterns = secretPatterns(exactSecrets)
  const hits: string[] = []
  let filesScanned = 0
  async function visit(directory: string): Promise<void> {
    const children = await readdir(directory, { withFileTypes: true })
    for (const child of children.sort((left, right) => left.name.localeCompare(right.name))) {
      const path = join(directory, child.name)
      if (child.isDirectory()) {
        await visit(path)
        continue
      }
      if (!child.isFile()) continue
      const metadata = await stat(path)
      if (metadata.size > maximumArtifactBytes) throw new Error('DSH E2E artifact exceeded the scan limit')
      filesScanned += 1
      const label = relative(root, path)
      const bytes = await readFile(path)
      for (const secret of exactSecrets) {
        if (secret !== '' && bytes.includes(Buffer.from(secret))) hits.push(label)
      }
      if (extname(path) === '.zip') {
        for (const entry of zipEntries(path)) {
          hits.push(...inspectText(`${label}:${entry}`, readZipEntry(path, entry), patterns))
        }
      } else if (textExtensions.has(extname(path))) {
        hits.push(...inspectText(label, bytes.toString('utf8'), patterns))
      }
    }
  }
  await visit(root)
  return { filesScanned, hits: [...new Set(hits)].sort() }
}
