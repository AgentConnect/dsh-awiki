import { describe, expect, it, vi } from 'vitest'
import type { ConnectionFetchRoute } from '@deepseek-ai/dsh-client-connection'
import { registerAwikiSettingsTransport } from '../src/settings-transport.ts'
import { AWIKI_SETTINGS_RPC_CHANNEL, AWIKI_SETTINGS_RPC_ENDPOINTS } from '../src/settings-rpc-contract.ts'

function setup() {
  const routes: ConnectionFetchRoute[] = []
  const handler = vi.fn(async (_endpoint: string, payload: unknown, _signal: AbortSignal) => ({ ok: true as const, value: payload }))
  registerAwikiSettingsTransport({ fetch: { register(route) { routes.push(route); return async () => {} } } }, handler)
  const route = routes.find(value => value.path.endsWith('/set-domain'))!
  const request = (origin = 'http://127.0.0.1', changes: Record<string, unknown> = {}) => new Request(`${origin}${route.path}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId: 'test-request', method: AWIKI_SETTINGS_RPC_ENDPOINTS.setDomain, payload: { domain: 'example.com', expectedRevision: 4 }, ...changes }),
  })
  return { routes, handler, route, request }
}

describe('AWiki settings Fetch transport', () => {
  it('preserves the revision-fenced payload, response correlation and cancellation signal', async () => {
    const b = setup()
    expect(b.routes.map(value => value.path)).toEqual(Object.values(AWIKI_SETTINGS_RPC_ENDPOINTS).map(endpoint => `${AWIKI_SETTINGS_RPC_CHANNEL}/${endpoint}`))
    const request = b.request()
    const response = await b.route.fetch(request)
    expect(await response.json()).toEqual({ type: 'server-response', rpcId: 'test-request', result: { ok: true, value: { domain: 'example.com', expectedRevision: 4 } } })
    expect(b.handler).toHaveBeenCalledWith(AWIKI_SETTINGS_RPC_ENDPOINTS.setDomain, { domain: 'example.com', expectedRevision: 4 }, request.signal)
  })

  it.each(['https://remote.example', 'http://192.168.1.20', 'http://127.0.0.1.evil.example'])('rejects a nonlocal authority before invoking the owner: %s', async origin => {
    const b = setup()
    expect((await b.route.fetch(b.request(origin))).status).toBe(403)
    expect(b.handler).not.toHaveBeenCalled()
  })

  it.each([{ method: 'switch-tenant' }, { type: 'server-response' }, { rpcId: '' }, { extra: true }])('rejects malformed or cross-endpoint envelopes: %j', async changes => {
    const b = setup()
    expect((await b.route.fetch(b.request(undefined, changes))).status).toBe(400)
    expect(b.handler).not.toHaveBeenCalled()
  })

  it('does not expose a rejected owner error to the browser', async () => {
    const b = setup()
    b.handler.mockRejectedValueOnce(new Error('private credentials'))
    const response = await b.route.fetch(b.request())
    expect(response.status).toBe(500)
    expect(await response.text()).not.toContain('private credentials')
  })
})
