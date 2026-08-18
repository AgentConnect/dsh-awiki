/** Model-facing AWiki read and approved-send tools. */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { GenericCallView, PreToolDecision } from '@deepseek-ai/dsh-tools'
import type { JsonValue } from '@deepseek-ai/dsh-session'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type {
  AwikiBindingId,
  AwikiConversationId,
  AwikiCursor,
  AwikiIdentityId,
  AwikiMessageTarget,
} from './types.ts'
import type { AwikiService } from './index.ts'

/** Model tool that reads the public deployment identity. */
export const AWIKI_IDENTITY_STATUS_TOOL = 'awiki_identity_status'
/** Model tool that lists Host-owned Agent identity bindings. */
export const AWIKI_AGENT_IDENTITY_LIST_TOOL = 'awiki_agent_identity_list'
/** Approved model tool that creates one remote Agent DID and route. */
export const AWIKI_AGENT_IDENTITY_CREATE_TOOL = 'awiki_agent_identity_create'
/** Approved model tool that attaches an existing binding/local identity. */
export const AWIKI_AGENT_IDENTITY_ATTACH_TOOL = 'awiki_agent_identity_attach'
/** Model tool that lists direct and existing group conversations. */
export const AWIKI_LIST_CONVERSATIONS_TOOL = 'awiki_list_conversations'
/** Model tool that reads one conversation history page. */
export const AWIKI_HISTORY_TOOL = 'awiki_history'
/** Model tool that sends an approved text message. */
export const AWIKI_SEND_MESSAGE_TOOL = 'awiki_send_message'
/** Model tool that sends one approved attachment. */
export const AWIKI_SEND_ATTACHMENT_TOOL = 'awiki_send_attachment'

const AWIKI_RESULT_OUTPUT = {
  schema: { type: 'json' as const },
  render: (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value) }],
}

/** Derive the typed SDK target from schema-validated model arguments. */
function target(kind: 'direct' | 'group', value: string): AwikiMessageTarget {
  return kind === 'direct' ? { kind, peer: value } : { kind, group: value }
}

/** Generic args-only card used by every AWiki tool. */
function present(title: string, kind: 'read' | 'other', rawInput?: unknown): GenericCallView {
  return { card: 'generic', title, kind, ...rawInput === undefined ? {} : { rawInput } }
}

function requireAgent(agent: Agent | undefined): Agent {
  if (agent === undefined) throw new TypeError('AWiki Agent identity tools require a DSH Agent context.')
  return agent
}

/** Project a DTO-only service result into the tool registry's JSON vocabulary. */
async function toolResult<Value>(pending: Promise<Value>): Promise<JsonValue> {
  return await pending as unknown as JsonValue
}

/**
 * Register all AWiki tools and their execution-time approval listener.
 * @param ctx - owning effect scope carrying the tool registry.
 * @param service - shared deployment AWiki service invoked by each tool.
 */
export function registerAwikiTools(ctx: Context, service: AwikiService): void {
  ctx.on('tools/pre-execute', (exec, next): Promise<PreToolDecision> => {
    if (exec.name === AWIKI_SEND_MESSAGE_TOOL) {
      return Promise.resolve({
        kind: 'ask',
        reason: 'Send a text message through the deployment AWiki identity',
      })
    }
    if (exec.name === AWIKI_SEND_ATTACHMENT_TOOL) {
      return Promise.resolve({
        kind: 'ask',
        reason: 'Send an attachment through the deployment AWiki identity',
      })
    }
    if (exec.name === AWIKI_AGENT_IDENTITY_CREATE_TOOL) {
      return Promise.resolve({
        kind: 'ask',
        reason: 'Create one permanent remote AWiki Agent DID and attach its DSH route',
      })
    }
    if (exec.name === AWIKI_AGENT_IDENTITY_ATTACH_TOOL) {
      return Promise.resolve({
        kind: 'ask',
        reason: 'Attach or replace one DSH Agent route with an existing AWiki identity',
      })
    }
    return next()
  })

  ctx.effect(() => ctx.tools.register(defineTool({
    name: AWIKI_IDENTITY_STATUS_TOOL,
    description: 'Return the deployment AWiki identity status. The result contains only the public handle and DID.',
    parameters: {},
    output: AWIKI_RESULT_OUTPUT,
    execute: (_args, exec) => toolResult(service.getIdentityForAgent(requireAgent(exec.agent))),
    presentCall: () => present('Read AWiki identity', 'read'),
  })), 'awiki: identity tool')

  ctx.effect(() => ctx.tools.register(defineTool({
    name: AWIKI_AGENT_IDENTITY_LIST_TOOL,
    description: 'List the main AWiki identity and every public DSH Agent identity binding. No credentials are returned.',
    parameters: {},
    output: AWIKI_RESULT_OUTPUT,
    execute: () => toolResult(service.listAgentIdentityBindings()),
    presentCall: () => present('List AWiki Agent identities', 'read'),
  })), 'awiki: Agent identity-list tool')

  ctx.effect(() => ctx.tools.register(defineTool({
    name: AWIKI_AGENT_IDENTITY_CREATE_TOOL,
    description: 'Create one permanent direct-only AWiki Agent DID and bind it to a DSH preset or session. User approval is required.',
    parameters: {
      display_name: { type: 'string', required: true, description: 'Public Agent display name, 1 to 40 characters.' },
      scope: { type: 'string', enum: ['preset', 'session'], required: true, description: 'Preset applies to every session using it; session applies only to one session.' },
      target_agent_id: { type: 'string', description: 'Current Agent by default, or one live direct child Agent id.' },
    },
    output: AWIKI_RESULT_OUTPUT,
    execute: (args, exec) => toolResult(service.createAgentIdentity(requireAgent(exec.agent), {
      displayName: args.display_name,
      scope: args.scope,
      ...args.target_agent_id === undefined ? {} : { targetAgentId: args.target_agent_id },
    })),
    presentCall: args => present('Create AWiki Agent identity', 'other', {
      display_name: args.display_name,
      scope: args.scope,
      ...args.target_agent_id === undefined ? {} : { target_agent_id: args.target_agent_id },
    }),
  })), 'awiki: Agent identity-create tool')

  ctx.effect(() => ctx.tools.register(defineTool({
    name: AWIKI_AGENT_IDENTITY_ATTACH_TOOL,
    description: 'Attach an existing AWiki Agent binding or unbound local identity to a DSH preset/session. User approval is required.',
    parameters: {
      binding_id: { type: 'string', description: 'Existing binding id from awiki_agent_identity_list.' },
      identity_id: { type: 'string', description: 'Unbound local identity id; use instead of binding_id.' },
      display_name: { type: 'string', description: 'Required only when adopting an unbound local identity.' },
      scope: { type: 'string', enum: ['preset', 'session'], required: true },
      target_agent_id: { type: 'string', description: 'Current Agent by default, or one live direct child Agent id.' },
      replace: { type: 'boolean', description: 'Explicitly replace an existing route.' },
    },
    output: AWIKI_RESULT_OUTPUT,
    execute: (args, exec) => toolResult(service.attachAgentIdentity(requireAgent(exec.agent), {
      ...args.binding_id === undefined ? {} : { bindingId: args.binding_id as AwikiBindingId },
      ...args.identity_id === undefined ? {} : { identityId: args.identity_id as AwikiIdentityId },
      ...args.display_name === undefined ? {} : { displayName: args.display_name },
      scope: args.scope,
      ...args.target_agent_id === undefined ? {} : { targetAgentId: args.target_agent_id },
      ...args.replace === undefined ? {} : { replace: args.replace },
    })),
    presentCall: args => present('Attach AWiki Agent identity', 'other', args),
  })), 'awiki: Agent identity-attach tool')

  ctx.effect(() => ctx.tools.register(defineTool({
    name: AWIKI_LIST_CONVERSATIONS_TOOL,
    description: 'List direct and existing group conversations for the deployment AWiki identity.',
    parameters: {
      cursor: { type: 'string', description: 'Opaque cursor returned by the preceding page.' },
      limit: { type: 'integer', description: 'Positive number of conversations to request.' },
    },
    output: AWIKI_RESULT_OUTPUT,
    execute: (args, exec) => toolResult(service.listConversationsForAgent(requireAgent(exec.agent), {
      ...args.cursor === undefined ? {} : { cursor: args.cursor as AwikiCursor },
      ...args.limit === undefined ? {} : { limit: args.limit },
    })),
    presentCall: args => present('List AWiki conversations', 'read', args),
  })), 'awiki: conversation-list tool')

  ctx.effect(() => ctx.tools.register(defineTool({
    name: AWIKI_HISTORY_TOOL,
    description: 'Read one direct or group AWiki conversation history page.',
    parameters: {
      conversation_id: { type: 'string', required: true, description: 'Conversation id from awiki_list_conversations.' },
      cursor: { type: 'string', description: 'Opaque cursor returned by the preceding page.' },
      limit: { type: 'integer', description: 'Positive number of messages to request.' },
    },
    output: AWIKI_RESULT_OUTPUT,
    execute: (args, exec) => toolResult(service.getHistoryForAgent(requireAgent(exec.agent), {
      conversationId: args.conversation_id as AwikiConversationId,
      ...args.cursor === undefined ? {} : { cursor: args.cursor as AwikiCursor },
      ...args.limit === undefined ? {} : { limit: args.limit },
    })),
    presentCall: args => present('Read AWiki history', 'read', { conversation_id: args.conversation_id }),
  })), 'awiki: history tool')

  ctx.effect(() => ctx.tools.register(defineTool({
    name: AWIKI_SEND_MESSAGE_TOOL,
    description: 'Send one idempotent text message as the deployment AWiki identity. User approval is required.',
    parameters: {
      target_kind: { type: 'string', enum: ['direct', 'group'], required: true },
      target: { type: 'string', required: true, description: 'Peer handle/DID for direct, or existing group id/DID for group.' },
      text: { type: 'string', required: true },
      idempotency_key: { type: 'string', required: true, description: 'Stable unique key for safe retry of this exact send.' },
    },
    output: AWIKI_RESULT_OUTPUT,
    execute: (args, exec) => toolResult(service.sendTextForAgent(requireAgent(exec.agent), {
      target: target(args.target_kind, args.target),
      text: args.text,
      idempotencyKey: args.idempotency_key,
    })),
    presentCall: args => present('Send AWiki message', 'other', {
      target_kind: args.target_kind,
      target: args.target,
      text: args.text,
    }),
  })), 'awiki: text-send tool')

  ctx.effect(() => ctx.tools.register(defineTool({
    name: AWIKI_SEND_ATTACHMENT_TOOL,
    description: 'Upload and send one idempotent attachment as the deployment AWiki identity. User approval is required.',
    parameters: {
      target_kind: { type: 'string', enum: ['direct', 'group'], required: true },
      target: { type: 'string', required: true, description: 'Peer handle/DID for direct, or existing group id/DID for group.' },
      file_name: { type: 'string', required: true },
      mime_type: { type: 'string', required: true },
      bytes_base64: { type: 'string', required: true, description: 'Canonical standard Base64 file bytes.' },
      caption: { type: 'string' },
      idempotency_key: { type: 'string', required: true, description: 'Stable unique key for safe retry of this exact send.' },
    },
    output: AWIKI_RESULT_OUTPUT,
    execute: (args, exec) => toolResult(service.sendAttachmentForAgent(requireAgent(exec.agent), {
      target: target(args.target_kind, args.target),
      fileName: args.file_name,
      mimeType: args.mime_type,
      bytesBase64: args.bytes_base64,
      ...args.caption === undefined ? {} : { caption: args.caption },
      idempotencyKey: args.idempotency_key,
    })),
    presentCall: args => present('Send AWiki attachment', 'other', {
      target_kind: args.target_kind,
      target: args.target,
      file_name: args.file_name,
      mime_type: args.mime_type,
      ...args.caption === undefined ? {} : { caption: args.caption },
    }),
  })), 'awiki: attachment-send tool')
}
