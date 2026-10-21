/** Apply the owning secret scanner before candidate evidence can be exported. */
import { chmod, lstat, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scanArtifacts } from './secret-scan.ts'

export async function scanCapabilityArtifacts(root: string): Promise<{
  status: 'passed' | 'failed'
  files_scanned: number
  hit_count: number
  quarantined: boolean
}> {
  if (!isAbsolute(root)) throw new Error('Private candidate run root required')
  const directory = await lstat(root)
  const fixturePath = join(root, 'fixture.json')
  const metadata = await lstat(fixturePath)
  if (!directory.isDirectory() || (directory.mode & 0o077) !== 0
    || !metadata.isFile() || (metadata.mode & 0o077) !== 0) {
    throw new Error('Private candidate fixture required')
  }
  const fixture = JSON.parse(await readFile(fixturePath, 'utf8')) as Record<string, unknown>
  if (typeof fixture.url !== 'string') throw new Error('Candidate fixture URL required')
  const url = new URL(fixture.url)
  const exactSecrets = [fixture.phone, fixture.otp, fixture.url, ...url.searchParams.values(), url.hash.slice(1)]
    .filter((value): value is string => typeof value === 'string' && value !== '')
  const report = join(root, 'report')
  let filesScanned = 0
  let hitCount = 0
  let passed = false
  try {
    if (!(await lstat(report)).isDirectory()) throw new Error('Report directory required')
    const scan = await scanArtifacts(report, exactSecrets)
    filesScanned = scan.filesScanned
    hitCount = scan.hits.length
    passed = filesScanned > 0 && hitCount === 0
  } catch {
    // Missing, unreadable or oversized evidence is not a successful scan.
  }
  let quarantined = false
  if (!passed) {
    const current = await lstat(report).catch(() => undefined)
    if (current !== undefined) {
      const quarantine = join(root, 'private-playwright-artifacts')
      if (await lstat(quarantine).catch(() => undefined)) throw new Error('Private evidence destination occupied')
      await rename(report, quarantine)
      if (current.isDirectory()) await chmod(quarantine, 0o700)
      quarantined = true
    }
    await mkdir(report, { mode: 0o700 })
  }
  const result = { status: passed ? 'passed' as const : 'failed' as const,
    files_scanned: filesScanned, hit_count: hitCount, quarantined }
  await writeFile(join(report, 'artifact-scan.json'), `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600 })
  return result
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await scanCapabilityArtifacts(process.argv[2] ?? '')
    process.stdout.write(`${JSON.stringify(result)}\n`)
    if (result.status !== 'passed') process.exitCode = 1
  } catch {
    process.stdout.write('{"status":"failed","failure_code":"artifact_privacy_gate_failed"}\n')
    process.exitCode = 1
  }
}
