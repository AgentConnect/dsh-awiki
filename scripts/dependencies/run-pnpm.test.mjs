import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runPnpmSync } from '../run-pnpm.mjs'

test('Windows nested pnpm preserves spaces and shell characters as arguments', {
  skip: process.platform !== 'win32',
}, (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'dsh-pnpm-'))
  const entry = join(directory, 'package manager & probe.mjs')
  writeFileSync(entry, 'process.stdout.write(JSON.stringify(process.argv.slice(2)))')
  const previous = process.env.npm_execpath
  process.env.npm_execpath = entry
  t.after(() => {
    if (previous === undefined) delete process.env.npm_execpath
    else process.env.npm_execpath = previous
    unlinkSync(entry)
    rmdirSync(directory)
  })
  const args = ['run', 'space value', 'literal&value', 'quote"value', '$()']
  const result = runPnpmSync(args, { cwd: directory, encoding: 'utf8' })
  assert.equal(result.error, undefined)
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(JSON.parse(result.stdout), args)
})

test('Windows nested pnpm rejects a missing parent entrypoint before spawning', {
  skip: process.platform !== 'win32',
}, (t) => {
  const previous = process.env.npm_execpath
  delete process.env.npm_execpath
  t.after(() => {
    if (previous !== undefined) process.env.npm_execpath = previous
  })
  assert.throws(() => runPnpmSync(['run', 'build:raw']), /through pnpm run/u)
})
