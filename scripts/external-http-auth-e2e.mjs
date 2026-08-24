/** Focused system-test driver for the Host-only external HTTP auth dispatcher. */

import { Context } from '@deepseek-ai/cordis'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import ApprovalService from '@deepseek-ai/dsh-user-approval'
import AnpIdentityService from '@agent-network-protocol/dsh-anp-identity'
import { apply as applyAnpIdentityProvider } from '@agent-network-protocol/dsh-anp-identity/provider'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import AwikiService from '../lib/index.js'
import { apply as applyProvider } from '../lib/provider.js'

const ACCEPT_SIGNATURE = 'sig1=("@method" "@target-uri" "@authority" "content-digest");created;expires;nonce;keyid'

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

function requestAuthScheme(request) {
  if (request.headers.get('authorization')?.startsWith('Bearer ')) return 'bearer'
  if (request.headers.has('signature-input') && request.headers.has('signature')) return 'signature'
  return 'none'
}

async function requestBodyDigest(request) {
  const body = Buffer.from(await request.clone().arrayBuffer())
  return createHash('sha256').update(body).digest('hex')
}

function authenticationChallenge(url, error, combined = false) {
  const realm = new URL(url).hostname
  const didWba = `DIDWba realm="${realm}", error="${error}", error_description="authentication retry required"`
  return new Response(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000 } }), {
    status: 401,
    headers: {
      'content-type': 'application/json',
      'www-authenticate': combined ? `Bearer realm="${realm}", ${didWba}` : didWba,
      'accept-signature': ACCEPT_SIGNATURE,
    },
  })
}

async function dispatchAwikiInfo(service, url, label, behavior = 'real') {
  let transportCalls = 0
  const schemes = []
  const bodyDigests = []
  const response = await service.externalHttpAuth.dispatch(
    new Request(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: label, method: 'get_me', params: {} }),
    }),
    async request => {
      transportCalls += 1
      schemes.push(requestAuthScheme(request))
      bodyDigests.push(await requestBodyDigest(request))
      if (behavior === 'exhaust' || (
        (behavior === 'retry' || behavior === 'combined-retry')
        && transportCalls === 1
      )) {
        return authenticationChallenge(
          url,
          schemes.at(-1) === 'bearer' ? 'invalid_access_token' : 'invalid_signature',
          behavior === 'combined-retry',
        )
      }
      return fetch(request)
    },
  )
  const body = await response.text()
  let rpcOk = false
  let rpcCode
  let bodyShape = 'invalid-json'
  try {
    const payload = JSON.parse(body)
    bodyShape = Array.isArray(payload)
      ? 'array'
      : payload !== null && typeof payload === 'object'
        ? `object:${Object.keys(payload).sort().join(',')}`
        : typeof payload
    rpcOk = (payload?.error === undefined || payload.error === null) && payload?.result !== undefined
    if (Number.isInteger(payload?.error?.code)) rpcCode = payload.error.code
  } catch {}
  return {
    status: response.status,
    transportCalls,
    schemes,
    sameBody: new Set(bodyDigests).size <= 1,
    rpcOk,
    ...(rpcCode === undefined ? {} : { rpcCode }),
    bodyShape,
    bodyLength: Buffer.byteLength(body),
  }
}

async function dispatchNoBodyAwikiInfo(service, baseUrl) {
  const url = new URL('/external-http-auth-test/no-body', baseUrl).toString()
  let transportCalls = 0
  const schemes = []
  const contentDigests = []
  const nullBodies = []
  const response = await service.externalHttpAuth.dispatch(
    new Request(url, { method: 'GET' }),
    async request => {
      transportCalls += 1
      schemes.push(requestAuthScheme(request))
      contentDigests.push(request.headers.has('content-digest'))
      nullBodies.push(request.body === null)
      if (transportCalls === 1) {
        return authenticationChallenge(url, 'invalid_access_token')
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    },
  )
  const body = await response.text()
  return {
    status: response.status,
    transportCalls,
    schemes,
    contentDigests,
    nullBodies,
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
  const remoteAuthUrl = typeof input?.remoteAuthUrl === 'string' && input.remoteAuthUrl.length > 0
    ? input.remoteAuthUrl
    : undefined
  const identityStateRoot = join(stateRoot, 'anp-identity')
  const ctx = new Context()
  try {
    await ctx.plugin(AgentRegistry)
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(ApprovalService)
    await ctx.plugin(AnpIdentityService, {
      stateRoot: identityStateRoot,
      allowConsumers: ['@awiki/dsh-plugin'],
      allowProviderConsumers: ['@awiki/dsh-plugin'],
      recoveryOnOpen: true,
    })
    applyAnpIdentityProvider(ctx, {
      stateRoot: identityStateRoot,
      rootKeyProvider: 'local-file',
    })
    const identityHealth = await ctx.anpIdentity.health()
    if (identityHealth.status === 'unavailable') fail('identity_provider', 'provider_unavailable')
    const serviceFiber = ctx.plugin(AwikiService, {
      userServiceUrl,
      userServiceDomain: didDomain,
      messageServiceUrl,
      messageServicePublicUrl: messageServiceUrl,
      messageServiceDid,
      stateRoot,
      ...(remoteAuthUrl === undefined ? { allowInsecureLoopbackForTesting: true } : {}),
    })
    await serviceFiber
    applyProvider(ctx)

    let registration = await ctx.awiki.registerIdentity({ handle, phone, otp })
    if (!registration.ok && registration.error.code === 'remote') {
      registration = await ctx.awiki.registerIdentity({ handle, phone, otp })
    }

    const session = await ctx.awiki.getSession()
    if (!session.ok || session.value.status !== 'active') {
      fail('registration', registration.ok ? 'identity_not_committed' : registration.error.code)
    }

    if (remoteAuthUrl !== undefined) {
      const results = {
        issue: await dispatchAwikiInfo(ctx.awiki, remoteAuthUrl, 'issue'),
        reuse: await dispatchAwikiInfo(ctx.awiki, remoteAuthUrl, 'reuse'),
        retry: await dispatchAwikiInfo(ctx.awiki, remoteAuthUrl, 'retry', 'retry'),
        combined: await dispatchAwikiInfo(
          ctx.awiki,
          remoteAuthUrl,
          'combined',
          'combined-retry',
        ),
        exhaust: await dispatchAwikiInfo(ctx.awiki, remoteAuthUrl, 'exhaust', 'exhaust'),
        reseed: await dispatchAwikiInfo(ctx.awiki, remoteAuthUrl, 'reseed'),
        noBody: await dispatchNoBodyAwikiInfo(ctx.awiki, remoteAuthUrl),
      }
      process.stdout.write(`${JSON.stringify({ ok: true, results })}\n`)
    } else {
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
    }
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
