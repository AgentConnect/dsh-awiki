import { mkdtemp, mkdir, writeFile, readFile, chmod, lstat, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, expect, test } from 'vitest'
import { scanCapabilityArtifacts } from './e2e/support/scan-capability-artifacts.ts'

const roots: string[] = []
async function fixture(): Promise<string> {
  const parent = join(process.cwd(), '.artifacts', 'capability-scan-unit')
  await mkdir(parent, { recursive: true })
  const root = await mkdtemp(join(parent, 'run-'))
  roots.push(root)
  await chmod(root, 0o700)
  await writeFile(join(root, 'fixture.json'), JSON.stringify({
    url: 'http://127.0.0.1:24680/?token=fixture-host-access', phone: '+15555550123', otp: '483927',
  }), { mode: 0o600 })
  await mkdir(join(root, 'report'), { mode: 0o700 })
  return root
}
afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

test('accepts nonempty safe evidence with closed scan counts', async () => {
  const root = await fixture()
  await writeFile(join(root, 'report', 'result.json'), '{"status":"passed"}')
  expect(await scanCapabilityArtifacts(root)).toEqual({ status: 'passed', files_scanned: 1, hit_count: 0, quarantined: false })
  expect(await readFile(join(root, 'report', 'result.json'), 'utf8')).toContain('passed')
})

test.each(['+15555550123', '483927', 'fixture-host-access',
  'eyJabcdefghijk.abcdefghijklmnop.abcdefghijklmnop'])('quarantines sensitive failure context without exporting the value', async secret => {
  const root = await fixture()
  await writeFile(join(root, 'report', 'error-context.md'), `Input value: ${secret}`)
  const result = await scanCapabilityArtifacts(root)
  expect(result).toEqual({ status: 'failed', files_scanned: 1, hit_count: 1, quarantined: true })
  expect((await lstat(join(root, 'private-playwright-artifacts'))).mode & 0o077).toBe(0)
  expect(await readFile(join(root, 'private-playwright-artifacts', 'error-context.md'), 'utf8')).toContain(secret)
  expect(await readFile(join(root, 'report', 'artifact-scan.json'), 'utf8')).not.toContain(secret)
  await expect(lstat(join(root, 'report', 'error-context.md'))).rejects.toThrow()
})

test.each([false, true])('rejects missing or empty evidence instead of attesting a scan (missing=%s)', async missing => {
  const root = await fixture()
  if (missing) await rm(join(root, 'report'), { recursive: true })
  const result = await scanCapabilityArtifacts(root)
  expect(result.status).toBe('failed')
  expect(result.quarantined).toBe(!missing)
})

test('rejects readable fixture before inspecting report content', async () => {
  const root = await fixture()
  await chmod(join(root, 'fixture.json'), 0o644)
  await expect(scanCapabilityArtifacts(root)).rejects.toThrow('Private candidate fixture required')
})
