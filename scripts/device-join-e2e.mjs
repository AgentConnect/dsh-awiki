/** Focused line-protocol driver for real DSH Device Join system tests. */

import { createInterface } from 'node:readline'
import { isAbsolute, join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import ApprovalService from '@deepseek-ai/dsh-user-approval'
import AnpIdentityService from '@agent-network-protocol/dsh-anp-identity'
import { apply as applyAnpIdentityProvider } from '@agent-network-protocol/dsh-anp-identity/provider'
import AwikiService from '../lib/index.js'
import { apply as applyProvider } from '../lib/provider.js'

function required(value, name) {
  if (typeof value !== 'string' || value.length === 0) throw Object.assign(new Error(name), { safeCode: 'invalid_input' })
  return value
}

function assertTestingTarget(config) {
  const targets = new Map([
    ['awiki.info', { origin: 'https://awiki.info', serviceDid: 'did:wba:awiki.info' }],
    ['rwiki.cn', { origin: 'https://rwiki.cn', serviceDid: 'did:wba:rwiki.cn' }],
  ])
  const target = targets.get(required(config.didDomain, 'didDomain'))
  const urls = ['userServiceUrl', 'messageServiceUrl', 'messageServicePublicUrl'].map(name => new URL(required(config[name], name)))
  if (target === undefined
    || required(config.messageServiceDid, 'messageServiceDid') !== target.serviceDid
    || urls.some(url => (
      url.origin !== target.origin
      || url.username !== ''
      || url.password !== ''
      || url.pathname !== '/'
      || url.search !== ''
      || url.hash !== ''
    ))) {
    throw Object.assign(new Error('target'), { safeCode: 'unsafe_target' })
  }
  if (!isAbsolute(required(config.stateRoot, 'stateRoot'))) {
    throw Object.assign(new Error('state root'), { safeCode: 'invalid_input' })
  }
  if (config.realtimeEnabled !== true
    || config.listenerEnabled !== false
    || !Array.isArray(config.listenerAllowedPeers)
    || config.listenerAllowedPeers.length !== 0) {
    throw Object.assign(new Error('realtime policy'), { safeCode: 'invalid_input' })
  }
}

function write(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`)
}

async function main() {
  const lines = createInterface({ input: process.stdin, crlfDelay: Infinity })
  const iterator = lines[Symbol.asyncIterator]()
  const first = await iterator.next()
  if (first.done) throw Object.assign(new Error('config'), { safeCode: 'invalid_input' })
  const config = JSON.parse(first.value)
  assertTestingTarget(config)

  const ctx = new Context()
  try {
    await ctx.plugin(AgentRegistry)
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(ApprovalService)
    const identityStateRoot = join(config.stateRoot, 'anp-identity')
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
    if (identityHealth.status === 'unavailable') {
      throw Object.assign(new Error('identity provider'), { safeCode: 'provider_unavailable' })
    }
    await ctx.plugin(AwikiService, {
      userServiceUrl: config.userServiceUrl,
      userServiceDomain: config.didDomain,
      messageServiceUrl: config.messageServiceUrl,
      messageServicePublicUrl: config.messageServicePublicUrl,
      messageServiceDid: config.messageServiceDid,
      stateRoot: config.stateRoot,
      realtimeEnabled: config.realtimeEnabled,
      listenerEnabled: config.listenerEnabled,
      listenerAllowedPeers: config.listenerAllowedPeers,
    })
    applyProvider(ctx)
    write({ ok: true, ready: true })

    for await (const line of { [Symbol.asyncIterator]: () => iterator }) {
      let command
      try {
        command = JSON.parse(line)
        let result
        switch (command.action) {
          case 'register':
            result = await ctx.awiki.sendRegistrationOtp({
              handle: required(command.handle, 'handle'), phone: required(command.phone, 'phone'),
            })
            if (result.ok) result = await ctx.awiki.registerIdentity({
              handle: required(command.handle, 'handle'), phone: required(command.phone, 'phone'),
              otp: required(command.otp, 'otp'),
            })
            break
          case 'begin_join': result = await ctx.awiki.beginDeviceJoin(); break
          case 'join_status': result = await ctx.awiki.getDeviceJoinStatus(); break
          case 'cancel_join': result = await ctx.awiki.cancelDeviceJoin(); break
          case 'session': result = await ctx.awiki.getSession(); break
          case 'realtime_diagnostics': result = ctx.awiki.getRealtimeDiagnostics(); break
          case 'device_refresh': result = await ctx.awiki.refreshDeviceManagement(); break
          case 'device_start': result = await ctx.awiki.startDeviceJoinVerification({ requestRef: required(command.requestRef, 'requestRef') }); break
          case 'device_approve': result = await ctx.awiki.approveDeviceJoin({
            requestRef: required(command.requestRef, 'requestRef'), enteredSas: required(command.enteredSas, 'enteredSas'),
            confirmation: required(command.confirmation, 'confirmation'),
          }); break
          case 'device_reject': result = await ctx.awiki.rejectDeviceJoin({ requestRef: required(command.requestRef, 'requestRef'), reason: 'user_rejected' }); break
          case 'device_revoke': result = await ctx.awiki.revokeDevice({
            deviceRef: required(command.deviceRef, 'deviceRef'), confirmation: required(command.confirmation, 'confirmation'),
          }); break
          case 'close': write({ ok: true, closed: true }); return
          default: throw Object.assign(new Error('action'), { safeCode: 'invalid_input' })
        }
        write({ ok: true, result })
      } catch (error) {
        write({ ok: false, code: typeof error?.safeCode === 'string' ? error.safeCode : 'operation_failed' })
      }
    }
  } finally {
    await ctx.fiber.dispose()
  }
}

main().catch(error => {
  write({ ok: false, code: typeof error?.safeCode === 'string' ? error.safeCode : 'startup_failed' })
  process.exitCode = 1
})
