import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { spawn } from 'node:child_process'
import { afterEach, expect, it, vi } from 'vitest'
import { applyScopedRegistrationOtp, waitForScopedOtpCooldown } from '../fixtures/scoped-otp.ts'
import { didWebFixtureHandle, type ProtectedE2eConfig } from '../fixtures/protected-config.ts'

vi.mock('node:child_process', () => ({ spawn: vi.fn() }))
afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); vi.unstubAllEnvs(); vi.useRealTimers() })
const runId = '20260924T080000Z-abcdef01'
const config = { target: 'agent-connect-cn-testing', scope: 'mail-delivery' } as ProtectedE2eConfig
function child(reply: unknown, code = 0) {
  let request = ''
  const process = Object.assign(new EventEmitter(), {
    stdin: new PassThrough(), stdout: new PassThrough(), stderr: new PassThrough(), kill: vi.fn(),
  })
  process.stdin.on('data', chunk => { request += chunk.toString() })
  process.stdin.on('finish', () => queueMicrotask(() => {
    // exit may precede delivery of the final stdout bytes; only close proves drain.
    process.emit('exit', code)
    process.stdout.emit('data', Buffer.from(JSON.stringify(reply)))
    process.emit('close', code)
  }))
  vi.mocked(spawn).mockReturnValue(process as unknown as ReturnType<typeof spawn>)
  return () => JSON.parse(request)
}

it('sends only run/role/Handle to a fixed operator and checks the exact receipt', async () => {
  vi.stubEnv('DSH_AWIKI_E2E_RUN_ID', runId)
  const request = child({ ok: true, result: {
    schemaVersion: 1, runId, role: 'cli', status: 'otp_replaced', cleanupProofSha256: 'a'.repeat(64),
    retryAt: new Date().toISOString(),
  } })
  const handle = didWebFixtureHandle('systestmd', runId, 'cli')
  await applyScopedRegistrationOtp(config, 'cli', handle)
  expect(request()).toEqual({ schemaVersion: 1, runId, role: 'cli', fullHandle: `${handle}.agent-connect.cn` })
  expect(spawn).toHaveBeenCalledWith('sudo', [
    '-n', '/usr/local/libexec/awiki-system-test/agent-connect-cn/user-otp-operator', '--apply',
  ], { stdio: ['pipe', 'pipe', 'pipe'] })
})

it('waits for the authoritative shared-phone deadline without disabling rate limits', async () => {
  vi.useFakeTimers()
  const done = vi.fn()
  const wait = waitForScopedOtpCooldown(new Date(Date.now() + 60_000).toISOString()).then(done)
  await vi.advanceTimersByTimeAsync(60_000)
  expect(done).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(1000)
  await wait
  expect(done).toHaveBeenCalledTimes(1)
})

it.each([
  { ok: false, secret: 'must-not-appear' },
  { ok: true, result: { schemaVersion: 1, runId: 'stale', role: 'cli', status: 'otp_replaced' } },
  { ok: true, result: { schemaVersion: 1, runId, role: 'dsh', status: 'otp_replaced' } },
])('rejects unconfirmed operator results without relaying raw output', async reply => {
  vi.stubEnv('DSH_AWIKI_E2E_RUN_ID', runId)
  child(reply)
  await expect(applyScopedRegistrationOtp(config, 'cli', didWebFixtureHandle('systestmd', runId, 'cli')))
    .rejects.toThrow('DSH E2E scoped OTP operator did not confirm the exact request')
})

it('does not invoke the operator for other targets or out-of-run Handles', async () => {
  vi.stubEnv('DSH_AWIKI_E2E_RUN_ID', runId)
  await applyScopedRegistrationOtp({ ...config, target: 'rwiki-cn-testing' }, 'cli', 'existing')
  await expect(applyScopedRegistrationOtp(config, 'cli', 'wrong')).rejects.toThrow('outside')
  expect(spawn).not.toHaveBeenCalled()
})
