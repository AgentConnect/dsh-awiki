import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import type { ApprovalOutcome } from '@deepseek-ai/dsh-user-approval'
import { remoteMethods } from '@deepseek-ai/dsh-typert-protocol'
import { executeTool, setup, testAgent } from './harness.ts'

interface MigrationBaseline {
  readonly remoteMethods: readonly string[]
  readonly toolSchemas: readonly unknown[]
  readonly approvalRequired: readonly string[]
  readonly failureMessages: Readonly<Record<string, string>>
}

const baseline = JSON.parse(readFileSync(
  new URL('./baseline/migration-contract.json', import.meta.url),
  'utf8',
)) as MigrationBaseline

let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
})

describe('Rust SDK migration contract baseline', () => {
  it('freezes every Remote method and complete model-tool schema', async () => {
    const harness = await setup()
    context = harness.ctx
    expect(remoteMethods(harness.ctx.awiki).map(marker => marker.method)).toEqual(baseline.remoteMethods)
    expect(harness.ctx.tools.schemas()
      .filter(tool => tool.name.startsWith('awiki_'))
      .sort((left, right) => left.name.localeCompare(right.name)))
      .toEqual(baseline.toolSchemas)
  })

  it('freezes approval requirements for all ten model tools', async () => {
    const harness = await setup()
    context = harness.ctx
    const agent = testAgent(harness.ctx)
    const requested: string[] = []
    harness.ctx.on('approval/request', (request) => {
      requested.push(request.toolName)
      return Promise.resolve<ApprovalOutcome>('allowed-once')
    })

    await executeTool(harness.ctx, agent, 'awiki_identity_status', {})
    await executeTool(harness.ctx, agent, 'awiki_list_conversations', {})
    await executeTool(harness.ctx, agent, 'awiki_history', { conversation_id: 'conversation-1' })
    await executeTool(harness.ctx, agent, 'awiki_send_message', {
      target_kind: 'direct', target: 'bob', text: 'baseline', idempotency_key: 'baseline-text',
    })
    await executeTool(harness.ctx, agent, 'awiki_send_attachment', {
      target_kind: 'group', target: 'group-1', file_name: 'baseline.txt', mime_type: 'text/plain',
      bytes_base64: 'YQ==', idempotency_key: 'baseline-attachment',
    })
    await executeTool(harness.ctx, agent, 'awiki_mail_account', {})
    await executeTool(harness.ctx, agent, 'awiki_mail_inbox', {})
    await executeTool(harness.ctx, agent, 'awiki_mail_read', { message_id: 'mail-1' })
    await executeTool(harness.ctx, agent, 'awiki_mail_mark_read', { message_ids: ['mail-1'] })
    await executeTool(harness.ctx, agent, 'awiki_mail_send', {
      to: ['bob@example.com'], subject: 'Baseline mail', body_text: 'Plain text baseline',
    })

    expect(requested).toEqual(baseline.approvalRequired)
  })

  it('freezes every public SDK failure code and redacted message', async () => {
    const harness = await setup()
    context = harness.ctx
    for (const [code, message] of Object.entries(baseline.failureMessages)) {
      harness.client.failure = Object.assign(new Error('private provider detail'), {
        name: 'AwikiImError',
        code,
      })
      await expect(harness.ctx.awiki.getIdentity()).resolves.toEqual({
        ok: false,
        error: { code, message },
      })
    }
  })
})
