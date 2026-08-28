import { existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const launcher = join(repositoryRoot, 'scripts', 'run-mail-attachments-system.mjs')
const cacheRoot = join(repositoryRoot, 'node_modules', '.cache', 'dsh-awiki-mail-attachments-system')

async function temporaryRuns(): Promise<readonly string[]> {
  return readdir(cacheRoot).then(
    entries => entries.filter(entry => entry.startsWith('run-')).sort(),
    error => error?.code === 'ENOENT' ? [] : Promise.reject(error),
  )
}

function runLauncher(arguments_: readonly string[], environment: Readonly<Record<string, string>> = {}) {
  return spawnSync(process.execPath, [launcher, ...arguments_], {
    cwd: repositoryRoot,
    env: { ...process.env, ...environment },
    encoding: 'utf8',
    timeout: 30_000,
  })
}

describe('mail attachment system Node launcher', () => {
  it('compiles and executes the real contract runner without tsx, then cleans its cache directory', { timeout: 30_000 }, async () => {
    expect(existsSync(join(repositoryRoot, 'node_modules', '.bin', 'tsx'))).toBe(false)
    expect(await temporaryRuns()).toEqual([])

    const result = runLauncher(['--contract-test'], {
      DSH_AWIKI_MAIL_SERVICE_URL: 'https://contract.test',
    })

    expect(result.status).toBe(0)
    expect(result.signal).toBeNull()
    expect(result.stdout).toContain('mail cleanup contract tests passed')
    expect(result.stderr).toBe('')
    expect(await temporaryRuns()).toEqual([])
  })

  it('propagates compiler failure and still removes the exact temporary directory', { timeout: 30_000 }, async () => {
    expect(await temporaryRuns()).toEqual([])

    const result = runLauncher(['--contract-test'], {
      NODE_ENV: 'test',
      DSH_AWIKI_SYSTEM_TEST_TSC_PATH: join(repositoryRoot, 'tests', 'missing-system-test-tsc.cjs'),
    })

    expect(result.status).toBe(1)
    expect(result.signal).toBeNull()
    expect(result.stderr).toContain('missing-system-test-tsc.cjs')
    expect(await temporaryRuns()).toEqual([])
  })

  it('propagates runner failure and cleans compiled output without masking the error', { timeout: 30_000 }, async () => {
    expect(await temporaryRuns()).toEqual([])

    const result = runLauncher([], {
      DSH_AWIKI_MAIL_SERVICE_URL: 'https://contract.test',
    })

    expect(result.status).toBe(1)
    expect(result.signal).toBeNull()
    expect(result.stderr).toContain('--manifest is required')
    expect(await temporaryRuns()).toEqual([])
  })
})
