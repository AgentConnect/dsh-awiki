import { isAbsolute } from 'node:path'

export function required(value, name) {
  if (typeof value !== 'string' || value.length === 0) throw Object.assign(new Error(name), { safeCode: 'invalid_input' })
  return value
}

export function assertTestingTarget(config) {
  const productionTargets = new Set(['awiki.me', 'awiki.ai'])
  const targets = new Map([
    ['awiki.info', { origin: 'https://awiki.info', serviceDid: 'did:wba:awiki.info' }],
    ['rwiki.cn', { origin: 'https://rwiki.cn', serviceDid: 'did:wba:rwiki.cn' }],
    ['test-fix.anpclaw.com', { origin: 'https://test-fix.anpclaw.com', serviceDid: 'did:wba:test-fix.anpclaw.com' }],
  ])
  const didDomain = required(config.didDomain, 'didDomain')
  if (productionTargets.has(didDomain)) {
    throw Object.assign(new Error('target'), { safeCode: 'unsafe_target' })
  }
  const target = targets.get(didDomain)
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
