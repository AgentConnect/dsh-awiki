import { createHash } from 'node:crypto'
import { chmod, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import { assertE2eConfigScope, assertMailDeliveryArguments, loadProtectedE2eConfig } from '../fixtures/protected-config.ts'
import { requiredCaseIds } from './case-ids.ts'
import { assertReviewedExecutionMode } from './sanitized-run-report.ts'

const roots: string[] = []
afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'dsh-mail-config-unit-'))
  roots.push(root)
  const cli = join(root, 'cli')
  const bytes = '#!/bin/sh\nexit 1\n'
  await writeFile(cli, bytes, { mode: 0o700 })
  const values = {
    schemaVersion: 2, scope: 'mail-delivery', target: 'rwiki-cn-testing',
    phone: '+10000000000', otp: '000000', handlePrefix: 'systestmd', cliBinary: cli,
    cliSourceRef: 'a'.repeat(40), cliSha256: createHash('sha256').update(bytes).digest('hex'),
  }
  const path = join(root, 'config.json')
  const save = (change: object = {}) => writeFile(path, JSON.stringify({ ...values, ...change }), { mode: 0o600 })
  await save()
  return { root, path, cli, values, save }
}

it.each(['rwiki-cn-testing', 'awiki-info-testing', 'agent-connect-cn-testing'])('loads minimal protected Mail config for %s', async target => {
  const { path, save } = await fixture()
  await save({ target, ...(target === 'agent-connect-cn-testing' ? { phone: '+999000000000' } : {}) })
  const config = await loadProtectedE2eConfig(path)
  expect(config.scope).toBe('mail-delivery')
  expect(config.targetBinding.name).toBe(target)
  expect(config.modelReceiptProducer).toBe('')
  expect(config.mailReceiptProducer).toBe('')
  expect(config.modelProxyUrl).toBe('')
  expect(() => assertE2eConfigScope(config, requiredCaseIds('live', ['--grep', 'MAIL-00']))).not.toThrow()
  for (const ids of [[], ['DSH-WEB-MAIL-001'], ['DSH-WEB-MAIL-002'],
    ['DSH-WEB-MAIL-001', 'DSH-WEB-MAIL-001'],
    ['DSH-WEB-MAIL-001', 'DSH-WEB-MAIL-002', 'DSH-WEB-MAIL-RECOVERY-001'],
    ['DSH-WEB-DID-WEB-001'], ['DSH-WEB-MODEL-RECOVERY-001'],
    ['DSH-WEB-DIRECT-001', 'DSH-WEB-DIRECT-002']]) {
    expect(() => assertE2eConfigScope(config, ids)).toThrow('requires exactly')
  }
})

it.each([
  'modelProxyUrl', 'modelPrompt', 'modelExpectedText', 'mailEchoRecipient',
  'modelReceiptPath', 'mailReceiptPath', 'modelArtifactSha256',
  'modelReceiptProducer', 'modelReceiptProducerSha256', 'modelReceiptProducerVersion',
  'mailReceiptProducer', 'mailReceiptProducerSha256', 'mailReceiptProducerVersion',
  'modelSourceCommit', 'modelSourceTree', 'mailSourceCommit', 'mailDeploymentArtifactSha256',
  'unknown',
])('rejects unrelated field %s even when empty', async key => {
  const { path, save } = await fixture()
  await save({ [key]: '' })
  await expect(loadProtectedE2eConfig(path)).rejects.toThrow('unrelated field')
})

it.each([
  { schemaVersion: 1 }, { target: 'anpclaw.com' }, { target: 'toString' },
  { phone: '10000000000' }, { otp: '12345' }, { handlePrefix: 'dshweb' },
  { cliBinary: './cli' }, { cliSourceRef: 'a'.repeat(39) }, { cliSourceRef: '0'.repeat(40) },
  { cliSha256: 'z'.repeat(64) }, { cliSha256: 'a'.repeat(63) }, { cliSha256: 'b'.repeat(64) },
  { scope: 'mail' },
])('rejects invalid Mail prerequisites: %j', async change => {
  const { path, save } = await fixture()
  await save(change)
  await expect(loadProtectedE2eConfig(path)).rejects.toThrow()
})

it('enforces config ownership, mode, non-symlink and absolute path', async () => {
  const { root, path } = await fixture()
  await expect(loadProtectedE2eConfig('relative.json')).rejects.toThrow('absolute')
  await chmod(path, 0o644)
  await expect(loadProtectedE2eConfig(path)).rejects.toThrow('0600')
  await chmod(path, 0o600)
  const link = join(root, 'linked.json')
  await symlink(path, link)
  await expect(loadProtectedE2eConfig(link)).rejects.toThrow('non-symlink')
  const uid = process.getuid!()
  vi.spyOn(process, 'getuid').mockReturnValue(uid + 1)
  await expect(loadProtectedE2eConfig(path)).rejects.toThrow('owned by')
})

it.each(['schemaVersion', 'target', 'phone', 'otp', 'handlePrefix', 'cliBinary', 'cliSourceRef', 'cliSha256'])('requires %s', async key => {
  const { path, save } = await fixture()
  await save({ [key]: undefined })
  await expect(loadProtectedE2eConfig(path)).rejects.toThrow()
})

it('preserves successful full v2 and DID Web loading', async () => {
  const { path, cli, values, save } = await fixture()
  await save({ scope: 'did-method-web' })
  expect((await loadProtectedE2eConfig(path)).scope).toBe('did-method-web')
  await save({
    scope: undefined, modelProxyUrl: 'https://model.example.test',
    modelPrompt: 'unit prompt', modelExpectedText: 'unit reply', mailEchoRecipient: 'echo@example.test',
    modelReceiptPath: `${cli}.model-receipt`, mailReceiptPath: `${cli}.mail-receipt`,
    modelArtifactSha256: 'b'.repeat(64), modelReceiptProducer: cli, mailReceiptProducer: cli,
    modelReceiptProducerSha256: values.cliSha256, mailReceiptProducerSha256: values.cliSha256,
    modelReceiptProducerVersion: 'unit-v1', mailReceiptProducerVersion: 'unit-v1',
    modelSourceCommit: 'c'.repeat(40), modelSourceTree: 'd'.repeat(40),
    mailSourceCommit: 'e'.repeat(40), mailDeploymentArtifactSha256: 'f'.repeat(64),
  })
  const config = await loadProtectedE2eConfig(path)
  expect(config.scope).toBeUndefined()
  expect(config.modelReceiptProducer).toBe(cli)
  expect(config.modelProxyUrl).toBe('https://model.example.test')
  expect(() => assertE2eConfigScope(config, ['DSH-WEB-MAIL-RECOVERY-001'])).not.toThrow()
})

it('rejects non-executable, symlinked, missing and changed CLI files', async () => {
  const { root, path, cli, save } = await fixture()
  await chmod(cli, 0o600)
  await expect(loadProtectedE2eConfig(path)).rejects.toThrow()
  await chmod(cli, 0o700)
  const link = join(root, 'linked-cli')
  await symlink(cli, link)
  await save({ cliBinary: link })
  await expect(loadProtectedE2eConfig(path)).rejects.toThrow('regular file')
  await save({ cliBinary: join(root, 'missing') })
  await expect(loadProtectedE2eConfig(path)).rejects.toThrow()
  await save()
  await writeFile(cli, '#!/bin/sh\nexit 2\n')
  await expect(loadProtectedE2eConfig(path)).rejects.toThrow('SHA-256 mismatch')
})

it('does not weaken full-config requirements or the awiki.info platform gate', async () => {
  const { path, save } = await fixture()
  await save({ scope: undefined })
  await expect(loadProtectedE2eConfig(path)).rejects.toThrow('modelProxyUrl')
  expect(() => assertReviewedExecutionMode('awiki-info-testing', 'linux', 'headed')).toThrow()
  expect(() => assertReviewedExecutionMode('awiki-info-testing', 'darwin', 'headless')).toThrow()
  expect(() => assertReviewedExecutionMode('awiki-info-testing', 'darwin', 'headed')).not.toThrow()
})

it('fences actual Playwright argv against mixed selectors and overrides', () => {
  for (const args of [['--grep', 'MAIL-00'], ['--headed', '--grep=MAIL-00']]) {
    expect(() => assertMailDeliveryArguments(args)).not.toThrow()
  }
  for (const args of [[], ['--grep', 'MAIL-001'], ['--grep', 'MAIL-00|DIRECT'],
    ['--grep', 'MAIL-00', '--grep', 'DIRECT'], ['--grep=MAIL-00', '--grep-invert=MAIL-002'],
    ['--grep=MAIL-00', '--config=other.ts'], ['--grep=MAIL-00', '--project=other'],
    ['--grep=MAIL-00', '--list'], ['--grep=MAIL-00', '--no-deps'], ['--grep=MAIL-00', 'other.spec.ts']]) {
    expect(() => assertMailDeliveryArguments(args)).toThrow()
  }
})
