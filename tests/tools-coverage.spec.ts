import { afterEach, describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import type { ApprovalOutcome } from '@deepseek-ai/dsh-user-approval'
import {
  AWIKI_HISTORY_TOOL,
  AWIKI_IDENTITY_STATUS_TOOL,
  AWIKI_LIST_CONVERSATIONS_TOOL,
  AWIKI_SEND_ATTACHMENT_TOOL,
  AWIKI_SEND_MESSAGE_TOOL,
} from '../src/index.ts'
import { executeTool, setup, testAgent } from './harness.ts'

let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
})

describe('AWiki-hosted DeepSeek tool arguments and presentation', () => {
  it('executes both pagination forms and renders every read-tool call', async () => {
    const harness = await setup()
    context = harness.ctx
    const agent = testAgent(harness.ctx)
    const listRequests: unknown[] = []
    const historyRequests: unknown[] = []
    harness.client.listConversations = (request) => {
      listRequests.push(request)
      return Promise.resolve({ items: [], hasMore: false })
    }
    harness.client.getHistory = (request) => {
      historyRequests.push(request)
      return Promise.resolve({ items: [], hasMore: false })
    }

    await executeTool(harness.ctx, agent, AWIKI_IDENTITY_STATUS_TOOL, {})
    await executeTool(harness.ctx, agent, AWIKI_LIST_CONVERSATIONS_TOOL, {})
    await executeTool(harness.ctx, agent, AWIKI_LIST_CONVERSATIONS_TOOL, { cursor: 'list-cursor', limit: 2 })
    await executeTool(harness.ctx, agent, AWIKI_HISTORY_TOOL, { conversation_id: 'conversation-1' })
    await executeTool(harness.ctx, agent, AWIKI_HISTORY_TOOL, {
      conversation_id: 'conversation-1', cursor: 'history-cursor', limit: 3,
    })

    expect(listRequests).toEqual([{}, { cursor: 'list-cursor', limit: 2 }])
    expect(historyRequests).toEqual([
      { conversationId: 'conversation-1' },
      { conversationId: 'conversation-1', cursor: 'history-cursor', limit: 3 },
    ])
    expect(harness.ctx.tools.get(AWIKI_IDENTITY_STATUS_TOOL)?.presentCall?.({})).toEqual({
      card: 'generic', title: 'Read AWiki identity', kind: 'read',
    })
    expect(harness.ctx.tools.get(AWIKI_LIST_CONVERSATIONS_TOOL)?.presentCall?.({ cursor: 'list-cursor', limit: 2 })).toEqual({
      card: 'generic', title: 'List AWiki conversations', kind: 'read', rawInput: { cursor: 'list-cursor', limit: 2 },
    })
    expect(harness.ctx.tools.get(AWIKI_HISTORY_TOOL)?.presentCall?.({ conversation_id: 'conversation-1' })).toEqual({
      card: 'generic', title: 'Read AWiki history', kind: 'read', rawInput: { conversation_id: 'conversation-1' },
    })
    expect(harness.ctx.tools.get(AWIKI_IDENTITY_STATUS_TOOL)?.output.render({}, { ok: true, value: null })).toEqual([
      { type: 'text', text: '{"ok":true,"value":null}' },
    ])
  })

  it('executes and presents both target kinds and optional attachment captions', async () => {
    const harness = await setup()
    context = harness.ctx
    const agent = testAgent(harness.ctx)
    harness.ctx.on('approval/request', () => Promise.resolve<ApprovalOutcome>('allowed-once'))

    await expect(executeTool(harness.ctx, agent, AWIKI_SEND_MESSAGE_TOOL, {
      target_kind: 'group', target: 'group-1', text: 'hello group', idempotency_key: 'text-group',
    })).resolves.toMatchObject({ isError: false })
    await expect(executeTool(harness.ctx, agent, AWIKI_SEND_ATTACHMENT_TOOL, {
      target_kind: 'direct', target: 'bob', file_name: 'hello.txt', mime_type: 'text/plain',
      bytes_base64: 'aGVsbG8=', caption: 'hello file', idempotency_key: 'attachment-direct',
    })).resolves.toMatchObject({ isError: false })

    expect(harness.ctx.tools.get(AWIKI_SEND_MESSAGE_TOOL)?.presentCall?.({
      target_kind: 'group', target: 'group-1', text: 'hello group', idempotency_key: 'text-group',
    })).toEqual({
      card: 'generic', title: 'Send AWiki message', kind: 'other',
      rawInput: { target_kind: 'group', target: 'group-1', text: 'hello group' },
    })
    expect(harness.ctx.tools.get(AWIKI_SEND_ATTACHMENT_TOOL)?.presentCall?.({
      target_kind: 'direct', target: 'bob', file_name: 'hello.txt', mime_type: 'text/plain',
      bytes_base64: 'aGVsbG8=', idempotency_key: 'attachment-direct',
    })).toEqual({
      card: 'generic', title: 'Send AWiki attachment', kind: 'other',
      rawInput: { target_kind: 'direct', target: 'bob', file_name: 'hello.txt', mime_type: 'text/plain' },
    })
    expect(harness.ctx.tools.get(AWIKI_SEND_ATTACHMENT_TOOL)?.presentCall?.({
      target_kind: 'direct', target: 'bob', file_name: 'hello.txt', mime_type: 'text/plain',
      bytes_base64: 'aGVsbG8=', caption: 'hello file', idempotency_key: 'attachment-direct',
    })).toEqual({
      card: 'generic', title: 'Send AWiki attachment', kind: 'other',
      rawInput: {
        target_kind: 'direct', target: 'bob', file_name: 'hello.txt', mime_type: 'text/plain', caption: 'hello file',
      },
    })
  })
})
