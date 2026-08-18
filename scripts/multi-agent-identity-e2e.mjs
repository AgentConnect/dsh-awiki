import { Context } from '@deepseek-ai/cordis'
import AgentRegistry, { Inbox } from '@deepseek-ai/dsh-agent'
import { CallId } from '@deepseek-ai/dsh-llm'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import ApprovalService from '@deepseek-ai/dsh-user-approval'
import AwikiService from '../lib/index.js'
import { apply as applyProvider } from '../lib/provider.js'

let rawInput = ''
for await (const chunk of process.stdin) rawInput += chunk
const input = JSON.parse(rawInput)
let stage = 'boot'

function enter(next) {
  stage = next
  process.stderr.write(`[dsh-multi-agent-e2e] ${next}\n`)
}

function agent(ctx, rawId) {
  const id = SessionId(rawId)
  const session = Session.create(id)
  session.append('turn/start', { turn: 1 })
  const scope = ctx.plugin(() => {})
  const value = {
    id,
    options: {},
    session,
    inbox: new Inbox(session, { inserted() {}, discarded() {}, claimed() {} }),
    status: 'idle',
    ctx: scope.ctx,
    followup() {},
    steer() {},
    inject() {},
    send() {},
    cancel() {},
    runMaintenance: task => task(new AbortController().signal),
    whenIdle: () => Promise.resolve(),
  }
  ctx.agents.register(value)
  return value
}

async function execute(ctx, actor, name, args) {
  const result = await ctx.tools.execute({
    signal: new AbortController().signal,
    callId: CallId(`e2e-${name}-${crypto.randomUUID()}`),
    name,
    arguments: args,
    agent: actor,
  })
  if (result.isError) throw Object.assign(new Error('tool execution failed'), { code: 'tool_execution_failed' })
  const block = result.content.find(item => item.type === 'text')
  if (block === undefined) throw Object.assign(new Error('tool result missing'), { code: 'tool_result_missing' })
  const value = JSON.parse(block.text)
  if (value?.ok !== true) throw Object.assign(new Error('AWiki operation rejected'), {
    code: value?.error?.code ?? 'awiki_rejected',
  })
  return value.value
}

async function harness() {
  const ctx = new Context()
  await ctx.plugin(AgentRegistry)
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(ApprovalService)
  ctx.on('approval/request', () => Promise.resolve('allowed-once'))
  await ctx.plugin(AwikiService, {
    userServiceUrl: input.userServiceUrl,
    userServiceDomain: input.didDomain,
    messageServiceUrl: input.messageServiceUrl,
    messageServicePublicUrl: input.messageServiceUrl,
    messageServiceDid: input.messageServiceDid,
    stateRoot: input.stateRoot,
    allowInsecureLoopbackForTesting: true,
    pollIntervalMs: 60_000,
  })
  applyProvider(ctx)
  return ctx
}

async function waitForHistory(ctx, actor, conversationId, matches) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const page = await execute(ctx, actor, 'awiki_history', {
        conversation_id: conversationId,
        limit: 100,
      })
      if (page.items.some(matches)) return page
    }
    catch {}
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw Object.assign(new Error('history did not converge'), { code: 'history_not_converged' })
}

async function createIdentity(ctx, actor, displayName) {
  let failure
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await execute(ctx, actor, 'awiki_agent_identity_create', {
        display_name: displayName,
        scope: 'session',
      })
    }
    catch (error) {
      failure = error
      await new Promise(resolve => setTimeout(resolve, 250))
    }
  }
  throw failure
}

try {
  enter('boot')
  let ctx = await harness()
  const first = agent(ctx, 'dsh-agent-a')
  const second = agent(ctx, 'dsh-agent-b')

  enter('register-main')
  const registered = await ctx.awiki.registerIdentity({
    handle: input.handle,
    phone: input.phone,
    otp: input.otp,
  })
  if (!registered.ok) throw Object.assign(new Error('main registration failed'), { code: registered.error.code })
  const mainDid = registered.value.did

  enter('provision-agents')
  const bindingA = await createIdentity(ctx, first, 'DSH Agent A')
  const bindingB = await createIdentity(ctx, second, 'DSH Agent B')
  const didA = bindingA.identity.did
  const didB = bindingB.identity.did
  if (didA === didB || didA === mainDid || didB === mainDid) {
    throw Object.assign(new Error('identity isolation failed'), { code: 'identity_not_isolated' })
  }

  enter('direct-message')
  const marker = `dsh-multi-agent-${crypto.randomUUID()}`
  const replyMarker = `dsh-multi-agent-reply-${crypto.randomUUID()}`
  const sentA = await execute(ctx, first, 'awiki_send_message', {
    target_kind: 'direct',
    target: bindingB.identity.handle,
    text: marker,
    idempotency_key: `send-${marker}`,
  })
  const sentB = await execute(ctx, second, 'awiki_send_message', {
    target_kind: 'direct',
    target: bindingA.identity.handle,
    text: replyMarker,
    idempotency_key: `send-${replyMarker}`,
  })
  enter('history-a')
  const historyA = await waitForHistory(
    ctx,
    first,
    sentA.conversationId,
    item => item.outgoing && item.content?.text === marker,
  )
  enter('history-b')
  const historyB = await waitForHistory(
    ctx,
    second,
    sentB.conversationId,
    item => item.outgoing && item.content?.text === replyMarker,
  )
  if (!historyA.items.some(item => item.outgoing && item.content?.text === marker)
    || !historyB.items.some(item => item.outgoing && item.content?.text === replyMarker)) {
    throw Object.assign(new Error('direct history isolation failed'), { code: 'direct_history_failed' })
  }
  const conversationsA = await execute(ctx, first, 'awiki_list_conversations', { limit: 100 })
  const conversationsB = await execute(ctx, second, 'awiki_list_conversations', { limit: 100 })
  if (!conversationsA.items.some(item => item.id === sentA.conversationId)
    || !conversationsB.items.some(item => item.id === sentB.conversationId)) {
    throw Object.assign(new Error('direct conversation isolation failed'), { code: 'direct_conversation_failed' })
  }

  enter('direct-only')
  const groupResult = await ctx.tools.execute({
    signal: new AbortController().signal,
    callId: CallId('e2e-agent-group-reject'),
    name: 'awiki_send_message',
    arguments: {
      target_kind: 'group', target: 'did:wba:example.invalid:group', text: 'blocked', idempotency_key: 'blocked-group',
    },
    agent: first,
  })
  const groupBlock = groupResult.content.find(item => item.type === 'text')
  const groupValue = groupBlock === undefined ? undefined : JSON.parse(groupBlock.text)
  if (groupValue?.error?.code !== 'agent-group-unsupported') {
    throw Object.assign(new Error('Agent group send was not rejected'), { code: 'group_not_rejected' })
  }

  enter('restart')
  await ctx.fiber.dispose()
  ctx = await harness()
  const restartedA = agent(ctx, 'dsh-agent-a')
  const restartedB = agent(ctx, 'dsh-agent-b')
  const statusA = await execute(ctx, restartedA, 'awiki_identity_status', {})
  const statusB = await execute(ctx, restartedB, 'awiki_identity_status', {})
  const tabs = await ctx.awiki.listIdentities()
  if (!tabs.ok || statusA.identity.did !== didA || statusB.identity.did !== didB || tabs.value.items.length !== 3) {
    throw Object.assign(new Error('restart binding recovery failed'), { code: 'restart_recovery_failed' })
  }
  await ctx.fiber.dispose()

  console.log(JSON.stringify({
    ok: true,
    identities: 3,
    bindings: 2,
    directIsolated: true,
    groupRejected: true,
    restartRecovered: true,
  }))
} catch (error) {
  console.log(JSON.stringify({
    ok: false,
    stage,
    code: typeof error?.code === 'string' ? error.code : 'internal',
  }))
  process.exitCode = 1
}
