import { spawn } from 'node:child_process'
import { access } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { reviewedE2eTarget } from '../fixtures/protected-config.ts'

const repositoryRoot = fileURLToPath(new URL('../../..', import.meta.url))
const systemTestRoot = resolve(repositoryRoot, '../awiki-system-test')
const remoteSystemTestRoot = '/home/ecs-user/awiki-space/worktrees/20260830-second-independent-environment/awiki-system-test'
const maximumOutputBytes = 64 * 1024

interface CleanupReceipt {
  readonly schemaVersion: 1
  readonly action: 'preflight' | 'cleanup'
  readonly ready: true
  readonly runId: string
  readonly accountCount?: number
  readonly residualCount?: number
}

interface CleanupInvocation {
  readonly command: string
  readonly args: readonly string[]
  readonly cwd: string
}

export function cleanupInvocationFor(platform: string): CleanupInvocation {
  if (platform === 'darwin') {
    return {
      command: 'ssh',
      args: [
        'ali',
        '/usr/bin/env',
        'AWIKI_SYSTEM_TEST_MODE=remote',
        'AWIKI_SYSTEM_TEST_TARGET=rwiki-cn-testing',
        'AWIKI_SYSTEM_TEST_OPERATOR_PROFILE=rwiki-cn-managed-local-v1',
        'AWIKI_SYSTEM_TEST_ALLOW_MANAGED_MESSAGE_CLEANUP=1',
        'E2E_DID_DOMAIN=rwiki.cn',
        'E2E_USER_SERVICE_URL=https://rwiki.cn',
        'E2E_MESSAGE_SERVICE_URL=https://rwiki.cn',
        'E2E_MESSAGE_SERVICE_WS_URL=wss://rwiki.cn/im/ws',
        `PYTHONPATH=${remoteSystemTestRoot}/src`,
        `${remoteSystemTestRoot}/.venv/bin/python`,
        '-m',
        'helpers.dsh_e2e_cleanup',
      ],
      cwd: repositoryRoot,
    }
  }
  return {
    command: 'uv',
    args: ['run', '--no-sync', 'python', '-m', 'helpers.dsh_e2e_cleanup'],
    cwd: systemTestRoot,
  }
}

function cleanupEnvironment(runId: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    LANG: process.env.LANG,
    AWIKI_SYSTEM_TEST_MODE: 'remote',
    AWIKI_SYSTEM_TEST_TARGET: reviewedE2eTarget.name,
    AWIKI_SYSTEM_TEST_OPERATOR_PROFILE: reviewedE2eTarget.operatorProfile,
    AWIKI_SYSTEM_TEST_ALLOW_MANAGED_MESSAGE_CLEANUP: '1',
    AWIKI_SYSTEM_TEST_RUN_ID: runId,
    E2E_DID_DOMAIN: reviewedE2eTarget.didDomain,
    E2E_USER_SERVICE_URL: reviewedE2eTarget.userServiceUrl,
    E2E_MESSAGE_SERVICE_URL: reviewedE2eTarget.messageServiceUrl,
    E2E_MESSAGE_SERVICE_WS_URL: reviewedE2eTarget.messageServiceWsUrl,
    PYTHONPATH: join(systemTestRoot, 'src'),
  }
  return Object.fromEntries(Object.entries(env).filter((entry): entry is [string, string] => entry[1] !== undefined))
}

async function invokeCleanup(request: object, runId: string): Promise<CleanupReceipt> {
  await access(join(systemTestRoot, 'pyproject.toml'))
  const invocation = cleanupInvocationFor(process.platform)
  return new Promise((resolveReceipt, rejectReceipt) => {
    const child = spawn(invocation.command, invocation.args, {
      cwd: invocation.cwd,
      env: cleanupEnvironment(runId),
      stdio: ['pipe', 'pipe', 'ignore'],
    })
    let stdout = ''
    child.stdout.on('data', chunk => {
      stdout += chunk.toString()
      if (Buffer.byteLength(stdout) > maximumOutputBytes) {
        child.kill('SIGTERM')
        rejectReceipt(new Error('DSH E2E cleanup receipt exceeded its safe limit'))
      }
    })
    child.once('error', () => rejectReceipt(new Error('DSH E2E cleanup operator could not start')))
    child.once('exit', code => {
      if (code !== 0) {
        rejectReceipt(new Error('DSH E2E cleanup operator rejected the request'))
        return
      }
      try {
        const envelope = JSON.parse(stdout) as {
          readonly schemaVersion?: unknown
          readonly ok?: unknown
          readonly result?: unknown
        }
        if (envelope.schemaVersion !== 1 || envelope.ok !== true || typeof envelope.result !== 'object' || envelope.result === null) {
          throw new Error('invalid')
        }
        const receipt = envelope.result as CleanupReceipt
        if (receipt.schemaVersion !== 1 || receipt.ready !== true || receipt.runId !== runId) throw new Error('invalid')
        resolveReceipt(receipt)
      } catch {
        rejectReceipt(new Error('DSH E2E cleanup operator returned an invalid receipt'))
      }
    })
    child.stdin.end(`${JSON.stringify(request)}\n`)
  })
}

export async function preflightManagedCleanup(runId: string): Promise<void> {
  const receipt = await invokeCleanup({
    schema_version: 1,
    action: 'preflight',
    run_id: runId,
  }, runId)
  if (receipt.action !== 'preflight') throw new Error('DSH E2E cleanup preflight receipt is invalid')
}

export async function cleanupManagedAccounts(runId: string, accountIds: readonly string[]): Promise<void> {
  const unique = [...new Set(accountIds)].sort()
  if (unique.length === 0 || unique.length !== accountIds.length) {
    throw new Error('DSH E2E cleanup account scope is invalid')
  }
  const receipt = await invokeCleanup({
    schema_version: 1,
    action: 'cleanup',
    run_id: runId,
    account_ids: unique,
  }, runId)
  if (
    receipt.action !== 'cleanup'
    || receipt.accountCount !== unique.length
    || receipt.residualCount !== 0
  ) throw new Error('DSH E2E cleanup receipt is invalid')
}

export async function resolveAccountId(fullHandle: string): Promise<string | undefined> {
  const request = JSON.stringify({
    jsonrpc: '2.0',
    id: 'dsh-e2e-cleanup-resolve',
    method: 'lookup',
    params: { handle: fullHandle },
  })
  let payload: { readonly result?: { readonly user_id?: unknown }; readonly error?: unknown }
  if (process.platform === 'darwin') {
    payload = await new Promise((resolvePayload, rejectPayload) => {
      const child = spawn('ssh', [
        'ali', 'curl', '-sS', '--fail', '--max-time', '15',
        '-H', 'content-type: application/json', '--data-binary', '@-',
        `${reviewedE2eTarget.userServiceUrl}/user-service/handle/rpc`,
      ], { stdio: ['pipe', 'pipe', 'ignore'] })
      let stdout = ''
      child.stdout.on('data', chunk => {
        stdout += chunk.toString()
        if (Buffer.byteLength(stdout) > maximumOutputBytes) child.kill('SIGTERM')
      })
      child.once('exit', code => {
        if (code !== 0) return rejectPayload(new Error('DSH E2E cleanup Handle resolve failed'))
        try { resolvePayload(JSON.parse(stdout)) } catch { rejectPayload(new Error('DSH E2E cleanup Handle resolve failed')) }
      })
      child.once('error', () => rejectPayload(new Error('DSH E2E cleanup Handle resolve failed')))
      child.stdin.end(request)
    })
  } else {
    const response = await fetch(`${reviewedE2eTarget.userServiceUrl}/user-service/handle/rpc`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-awiki-client-version': '0.3.9',
    },
    body: request,
    signal: AbortSignal.timeout(15_000),
  })
    if (response.status !== 200) throw new Error('DSH E2E cleanup Handle resolve failed')
    payload = await response.json() as typeof payload
  }
  if (payload.error !== undefined) return undefined
  const accountId = payload.result?.user_id
  if (typeof accountId !== 'string' || !/^[A-Za-z0-9._:-]{1,64}$/u.test(accountId)) {
    throw new Error('DSH E2E cleanup Handle resolve returned no account ID')
  }
  return accountId
}
