/** Local system-test driver for the Host-only external HTTP auth dispatcher. */

import { Context } from '@deepseek-ai/cordis'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import ApprovalService from '@deepseek-ai/dsh-user-approval'
import { openImCoreNodeClient } from '@awiki/im-core-node'
import AwikiService from '../lib/index.js'
import { apply as applyProvider } from '../lib/provider.js'

function fail(stage, code) {
  const error = new Error(stage)
  error.stage = stage
  error.safeCode = code
  throw error
}

function requireString(input, name) {
  const value = input?.[name]
  if (typeof value !== 'string' || value.length === 0) fail('input', 'invalid_input')
  return value
}

async function dispatch(service, url, label) {
  let transportCalls = 0
  const response = await service.externalHttpAuth.dispatch(
    new Request(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ label }),
    }),
    async request => {
      transportCalls += 1
      return fetch(request)
    },
  )
  const body = await response.text()
  return {
    status: response.status,
    transportCalls,
    bodyLength: Buffer.byteLength(body),
  }
}

async function main() {
  let rawInput = ''
  for await (const chunk of process.stdin) rawInput += chunk
  const input = JSON.parse(rawInput)
  const stateRoot = requireString(input, 'stateRoot')
  const userServiceUrl = requireString(input, 'userServiceUrl')
  const didDomain = requireString(input, 'didDomain')
  const messageServiceUrl = requireString(input, 'messageServiceUrl')
  const messageServiceDid = requireString(input, 'messageServiceDid')
  const handle = requireString(input, 'handle')
  const phone = requireString(input, 'phone')
  const otp = requireString(input, 'otp')
  const bootstrap = await openImCoreNodeClient({
    stateRoot,
    serviceBaseUrl: userServiceUrl,
    didDomain,
    userServiceEndpoint: userServiceUrl,
    messageServiceEndpoint: messageServiceUrl,
    anpServiceEndpoint: messageServiceUrl,
    anpServiceDid: messageServiceDid,
    externalHttpAllowInsecureLoopbackForTesting: true,
  })
  let registrationCode
  try {
    await bootstrap.completeRegistration({ handle, phone, otp })
  } catch (error) {
    registrationCode = typeof error?.code === 'string' ? error.code : 'internal'
    if (registrationCode === 'service_error') {
      try {
        await bootstrap.completeRegistration({ handle, phone, otp })
        registrationCode = undefined
      } catch (retryError) {
        registrationCode = typeof retryError?.code === 'string' ? retryError.code : 'internal'
      }
    }
  } finally {
    await bootstrap.close()
  }
  const ctx = new Context()
  try {
    await ctx.plugin(AgentRegistry)
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(ApprovalService)
    const serviceFiber = ctx.plugin(AwikiService, {
      userServiceUrl,
      userServiceDomain: didDomain,
      messageServiceUrl,
      messageServicePublicUrl: messageServiceUrl,
      messageServiceDid,
      stateRoot,
      allowInsecureLoopbackForTesting: true,
    })
    await serviceFiber
    applyProvider(ctx)

    const session = await ctx.awiki.getSession()
    if (!session.ok || session.value.status !== 'active') {
      fail('registration', registrationCode ?? 'identity_not_committed')
    }

    const primary = requireString(input, 'primaryOrigin')
    const secondary = requireString(input, 'secondaryOrigin')
    const results = {
      issue: await dispatch(ctx.awiki, `${primary}/issue`, 'issue'),
      reuse: await dispatch(ctx.awiki, `${primary}/reuse`, 'reuse'),
      retry: await dispatch(ctx.awiki, `${primary}/retry`, 'retry'),
      exhaust: await dispatch(ctx.awiki, `${primary}/exhaust`, 'exhaust'),
      isolation: await dispatch(ctx.awiki, `${secondary}/isolation`, 'isolation'),
      redirect: await dispatch(ctx.awiki, `${primary}/redirect`, 'redirect'),
    }
    process.stdout.write(`${JSON.stringify({ ok: true, results })}\n`)
  } finally {
    await ctx.fiber.dispose()
  }
}

main().catch(error => {
  process.stdout.write(`${JSON.stringify({
    ok: false,
    stage: typeof error?.stage === 'string' ? error.stage : 'internal',
    code: typeof error?.safeCode === 'string' ? error.safeCode : 'internal',
  })}\n`)
  process.exitCode = 1
})
