import { describe, expect, it } from 'vitest'
import { assertTestingTarget } from '../scripts/device-join-target.mjs'

const configFor = (domain: string) => ({
  stateRoot: '/tmp/dsh-device-join-target-test',
  didDomain: domain,
  userServiceUrl: `https://${domain}`,
  messageServiceUrl: `https://${domain}`,
  messageServicePublicUrl: `https://${domain}`,
  messageServiceDid: `did:wba:${domain}`,
  realtimeEnabled: true,
  listenerEnabled: false,
  listenerAllowedPeers: [],
})

describe('Device Join exact test targets', () => {
  it.each(['awiki.info', 'rwiki.cn', 'test-fix.anpclaw.com'])('accepts %s without starting services', (domain) => {
    expect(() => assertTestingTarget(configFor(domain))).not.toThrow()
  })
  it.each(['awiki.ai', 'awiki.me', 'anpclaw.com', 'test-fix-b.anpclaw.com', 'test-fix.anpclaw.com.evil.example'])('rejects unaudited %s', (domain) => {
    expect(() => assertTestingTarget(configFor(domain))).toThrow()
  })
  it.each([
    { userServiceUrl: 'http://test-fix.anpclaw.com' },
    { userServiceUrl: 'https://test-fix.anpclaw.com:8443' },
    { userServiceUrl: 'https://test-fix.anpclaw.com/path' },
    { userServiceUrl: 'https://test-fix.anpclaw.com?redirect=elsewhere' },
    { userServiceUrl: 'https://test-fix.anpclaw.com#fragment' },
    { userServiceUrl: 'https://user:password@test-fix.anpclaw.com' },
    { messageServicePublicUrl: 'https://awiki.info' },
    { messageServiceDid: 'did:wba:awiki.info' },
    { stateRoot: 'relative' },
    { realtimeEnabled: false },
    { listenerEnabled: true },
    { listenerAllowedPeers: ['unexpected'] },
  ])('rejects unsafe target or runtime configuration %j', (override) => {
    expect(() => assertTestingTarget({ ...configFor('test-fix.anpclaw.com'), ...override })).toThrow()
  })
})
