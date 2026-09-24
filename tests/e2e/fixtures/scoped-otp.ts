import { spawn } from 'node:child_process'
import type { ProtectedE2eConfig } from './protected-config.ts'
import { didWebFixtureHandle } from './protected-config.ts'

const operator = '/usr/local/libexec/awiki-system-test/agent-connect-cn/user-otp-operator'

/** Fixed SSH/root operator, invoked only after the normal OTP request succeeds. */
export async function applyScopedRegistrationOtp(
  config: ProtectedE2eConfig, role: 'cli' | 'dsh', localHandle: string,
): Promise<string | undefined> {
  if (config.target !== 'agent-connect-cn-testing') return
  const runId = process.env.DSH_AWIKI_E2E_RUN_ID
  if (config.scope !== 'mail-delivery' || runId === undefined
    || !/^[0-9]{8}T[0-9]{6}Z-[a-f0-9]{8}$/u.test(runId)
    || localHandle !== didWebFixtureHandle('systestmd', runId, role)) {
    throw new Error('DSH E2E scoped OTP request is outside the reviewed run')
  }
  const command = process.platform === 'darwin' ? 'ssh' : 'sudo'
  const args = process.platform === 'darwin'
    ? ['ali', 'sudo', '-n', operator, '--apply'] : ['-n', operator, '--apply']
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] })
    let output = ''
    let size = 0
    let settled = false
    const fail = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      child.kill('SIGTERM')
      reject(new Error('DSH E2E scoped OTP operator did not confirm the exact request'))
    }
    const timer = setTimeout(fail, 30_000)
    child.once('error', fail)
    child.stdout.on('data', chunk => {
      size += chunk.length
      if (size > 8192) fail()
      else output += chunk.toString()
    })
    child.stderr.on('data', chunk => { size += chunk.length; if (size > 8192) fail() })
    child.once('close', code => {
      if (settled) return
      try {
        const decoded = JSON.parse(output)
        const result = decoded.result
        if (code !== 0 || decoded.ok !== true || result?.schemaVersion !== 1
          || result.runId !== runId || result.role !== role || result.status !== 'otp_replaced'
          || !/^[a-f0-9]{64}$/u.test(result.cleanupProofSha256)
          || typeof result.retryAt !== 'string' || !Number.isFinite(Date.parse(result.retryAt))
          || Date.parse(result.retryAt) > Date.now() + 90_000) throw new Error('invalid')
        clearTimeout(timer)
        settled = true
        resolve(result.retryAt)
      } catch { fail() }
    })
    child.stdin.on('error', fail)
    child.stdin.end(JSON.stringify({ schemaVersion: 1, runId, role,
      fullHandle: `${localHandle}.agent-connect.cn` }))
  })
}

/** Serialize the two shared-phone requests against the server's persisted send time. */
export async function waitForScopedOtpCooldown(retryAt: string | undefined): Promise<void> {
  if (retryAt === undefined) return
  const deadline = Date.parse(retryAt)
  if (!Number.isFinite(deadline) || deadline > Date.now() + 90_000) {
    throw new Error('DSH E2E scoped OTP cooldown receipt is invalid')
  }
  const remaining = deadline - Date.now()
  if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining + 1000))
}
