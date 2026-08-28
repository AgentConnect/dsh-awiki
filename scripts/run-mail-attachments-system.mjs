#!/usr/bin/env node

import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = resolve(scriptDirectory, '..')
const cacheRoot = join(repositoryRoot, 'node_modules', '.cache', 'dsh-awiki-mail-attachments-system')
const compiledRunnerRelative = join('tests', 'system', 'mail-attachments-remote.js')
const require = createRequire(import.meta.url)

function testCompilerOverride() {
  const override = process.env.NODE_ENV === 'test'
    ? process.env.DSH_AWIKI_SYSTEM_TEST_TSC_PATH?.trim()
    : undefined
  return override ? resolve(override) : require.resolve('typescript/bin/tsc')
}

function runChild(arguments_) {
  return new Promise((resolveChild, rejectChild) => {
    const child = spawn(process.execPath, arguments_, {
      cwd: repositoryRoot,
      env: process.env,
      stdio: 'inherit',
    })
    const forwardSignal = signal => {
      if (child.exitCode === null && child.signalCode === null) child.kill(signal)
    }
    const onSigint = () => forwardSignal('SIGINT')
    const onSigterm = () => forwardSignal('SIGTERM')
    process.once('SIGINT', onSigint)
    process.once('SIGTERM', onSigterm)
    const cleanupListeners = () => {
      process.off('SIGINT', onSigint)
      process.off('SIGTERM', onSigterm)
    }
    child.once('error', error => {
      cleanupListeners()
      rejectChild(error)
    })
    child.once('exit', (code, signal) => {
      cleanupListeners()
      resolveChild({ code: code ?? 1, signal })
    })
  })
}

function assertTemporaryRunPath(path) {
  const child = relative(cacheRoot, path)
  if (child === '' || child.startsWith('..') || isAbsolute(child) || !child.startsWith('run-')) {
    throw new Error('refusing to clean a non-temporary system runner path')
  }
}

async function launch() {
  await mkdir(cacheRoot, { recursive: true })
  const runRoot = await mkdtemp(join(cacheRoot, 'run-'))
  let outcome
  try {
    const compile = await runChild([
      testCompilerOverride(),
      '-p', join(repositoryRoot, 'tsconfig.system.json'),
      '--noEmit', 'false',
      '--declaration', 'false',
      '--declarationMap', 'false',
      '--sourceMap', 'false',
      '--outDir', runRoot,
      '--rootDir', repositoryRoot,
    ])
    if (compile.code !== 0 || compile.signal !== null) return compile
    outcome = await runChild([
      join(runRoot, compiledRunnerRelative),
      ...process.argv.slice(2),
    ])
    return outcome
  } finally {
    assertTemporaryRunPath(runRoot)
    await rm(runRoot, { recursive: true, force: true })
  }
}

let outcome
try {
  outcome = await launch()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`mail attachments system launcher failed: ${message}\n`)
  outcome = { code: 1, signal: null }
}

if (outcome.signal !== null) process.kill(process.pid, outcome.signal)
else process.exitCode = outcome.code
