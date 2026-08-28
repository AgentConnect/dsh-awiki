import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Include from '@deepseek-ai/cordis-plugin-include'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import ApprovalService from '@deepseek-ai/dsh-user-approval'
import AwikiService from '../src/index.ts'
import { FakeAwikiClient } from './harness.ts'

let root: string | undefined
let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
})

/** Function plugin used by the real Loader composition as its keyless provider. */
const FakeProvider = {
  name: 'awiki-fake-provider',
  inject: ['awiki'],
  apply(ctx: Context) {
    ctx.effect(
      () => ctx.awiki.registerClientFactory(() => new FakeAwikiClient()),
      'AWiki Loader fake client',
    )
  },
}

async function shippingPatchNumericDefault(key: string, environmentName: string): Promise<number> {
  const source = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8')
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const escapedEnvironmentName = environmentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = source.match(new RegExp(
    `^\\s*${escapedKey}: !!js Number\\(process\\.env\\.${escapedEnvironmentName} \\?\\? '([0-9]+)'\\)\\s*$`,
    'm',
  ))
  if (match === null) throw new Error(`missing numeric cordis.patch default for ${key}`)
  const value = Number(match[1])
  if (!Number.isSafeInteger(value)) throw new Error(`invalid numeric cordis.patch default for ${key}`)
  return value
}

/** Boot the shipping service namespace and keyless provider through cordis.yml. */
async function boot(): Promise<Context> {
  const mailAttachmentMaxCount = await shippingPatchNumericDefault(
    'mailAttachmentMaxCount',
    'DSH_AWIKI_MAIL_ATTACHMENT_MAX_COUNT',
  )
  const mailAttachmentMaxBytes = await shippingPatchNumericDefault(
    'mailAttachmentMaxBytes',
    'DSH_AWIKI_MAIL_ATTACHMENT_MAX_BYTES',
  )
  const mailAttachmentTotalMaxBytes = await shippingPatchNumericDefault(
    'mailAttachmentTotalMaxBytes',
    'DSH_AWIKI_MAIL_ATTACHMENT_TOTAL_MAX_BYTES',
  )
  root = await mkdtemp(join(tmpdir(), 'dsh-awiki-loader-'))
  const configPath = join(root, 'cordis.yml')
  await writeFile(configPath, [
    "- name: '@deepseek-ai/dsh-agent'",
    "- name: '@deepseek-ai/dsh-system-prompt'",
    "- name: '@deepseek-ai/dsh-tools'",
    "- name: '@deepseek-ai/dsh-user-approval'",
    "- name: '@awiki/dsh-plugin'",
    '  config:',
    '    userServiceUrl: https://users.awiki.example',
    '    userServiceDomain: awiki.example',
    '    messageServiceUrl: https://messages.awiki.example',
    '    messageServicePublicUrl: https://messages.awiki.example',
    '    messageServiceDid: did:wba:messages.awiki.example',
    `    stateRoot: ${JSON.stringify(join(root, 'im-core'))}`,
    '    pollIntervalMs: 4500',
    `    mailAttachmentMaxCount: ${mailAttachmentMaxCount}`,
    `    mailAttachmentMaxBytes: ${mailAttachmentMaxBytes}`,
    `    mailAttachmentTotalMaxBytes: ${mailAttachmentTotalMaxBytes}`,
    "- name: '@fixture/awiki-provider'",
    '',
  ].join('\n'))

  const ctx = new Context()
  context = ctx
  ctx.baseUrl = pathToFileURL(root).href + '/'
  await ctx.plugin(Loader)
  ctx.loader.builtins.include = Include
  const modules = new Map<string, unknown>([
    ['@deepseek-ai/dsh-agent', AgentRegistry],
    ['@deepseek-ai/dsh-system-prompt', SystemPrompt],
    ['@deepseek-ai/dsh-tools', ToolRuntime],
    ['@deepseek-ai/dsh-user-approval', ApprovalService],
    ['@awiki/dsh-plugin', { default: AwikiService }],
    ['@fixture/awiki-provider', FakeProvider],
  ])
  ctx.loader.internal = {
    version: 'v2',
    async import(specifier: string) {
      if (!modules.has(specifier)) throw new Error(`unexpected Loader import: ${specifier}`)
      return modules.get(specifier)
    },
  } as unknown as NonNullable<typeof ctx.loader.internal>
  await ctx.loader.create({ name: 'cordis:include', config: { path: pathToFileURL(configPath).href } })
  await ctx.loader.await()
  return ctx
}

describe('AWiki real Loader composition', () => {
  it('loads shipping patch mail defaults through the service config boundary', async () => {
    const ctx = await boot()
    await expect(ctx.awiki.getConfig()).resolves.toEqual({
      ok: true,
      value: {
        pollIntervalMs: 4_500,
        attachmentMaxBytes: 10 * 1024 * 1024,
        mailAttachmentMaxCount: 10,
        mailAttachmentMaxBytes: 10 * 1024 * 1024,
        mailAttachmentTotalMaxBytes: 18 * 1024 * 1024,
      },
    })
    await expect(ctx.awiki.getIdentity()).resolves.toMatchObject({ ok: true, value: { handle: 'alice' } })
    await expect(ctx.awiki.createGroup({
      name: 'Snapshot Crew',
      members: ['bob.awiki.example'],
    })).resolves.toMatchObject({
      ok: true,
      value: {
        conversation: { kind: 'group', title: 'Snapshot Crew' },
        addedMembers: [{ handle: 'bob.awiki.example' }],
        failedMembers: [],
      },
    })
    expect(ctx.tools.schemas().map(tool => tool.name).filter(name => name.startsWith('awiki_'))).toHaveLength(10)
  })

  it('unloading the provider removes its client and waits for disposal', async () => {
    const ctx = await boot()
    const providerEntry = [...ctx.loader.entries()].find(entry => entry.options.name === '@fixture/awiki-provider')
    expect(providerEntry?.fiber).toBeDefined()
    await providerEntry?.fiber?.dispose()
    await expect(ctx.awiki.getIdentity()).resolves.toMatchObject({
      ok: false,
      error: { code: 'remote', message: 'AWiki client provider is unavailable.' },
    })
  })
})
