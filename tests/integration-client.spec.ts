import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AwikiExternalHttpAuth } from '../src/external-http-auth.ts'
import { AwikiIntegrationClient } from '../src/integration-client.ts'

const responseBody = {
  id: '01991a35-1c80-7d9d-80aa-111111111111',
  public_id: 'agi_public',
  integration_url: 'https://awiki.info/guest/i/agi_public',
  owner: {
    tenant_id: 'main',
    handle: 'developer.awiki.info',
    current_did: 'did:wba:awiki.info:developer',
    display_name: 'Developer',
  },
  product_name: 'Example product',
  description: 'Description',
  contact_enabled: true,
  contact_description: 'Contact us',
  group_targets: [{
    id: '01991a35-1c80-7d9d-80aa-222222222222',
    group_did: 'did:wba:awiki.info:group:example',
    display_name: 'Community',
    avatar_url: null,
    description: 'Join us',
    availability: 'eligible',
  }],
  status: 'active',
  revision: 3,
}

function client(captured: Request[]) {
  const auth: AwikiExternalHttpAuth = {
    async dispatch(request, transport) {
      captured.push(request.clone())
      return transport(request)
    },
  }
  return new AwikiIntegrationClient('https://awiki.info', auth)
}

afterEach(() => vi.unstubAllGlobals())

describe('AWiki Integration Host client', () => {
  it('uses only the fixed management route and translates the public DTO', async () => {
    const requests: Request[] = []
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(responseBody)))

    const result = await client(requests).create({
      productName: 'Example product',
      description: 'Description',
      contactEnabled: true,
      contactDescription: 'Contact us',
      groupTargets: [{ groupDid: 'did:wba:awiki.info:group:example', description: 'Join us' }],
      idempotencyKey: '01991a35-1c80-7d9d-80aa-333333333333',
    })

    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({
        publicId: 'agi_public',
        productName: 'Example product',
        revision: 3,
      }),
    })
    expect(requests).toHaveLength(1)
    expect(requests[0]?.url).toBe('https://awiki.info/guest/api/v1/management/integration')
    expect(requests[0]?.method).toBe('POST')
    expect(requests[0]?.headers.get('idempotency-key')).toBe('01991a35-1c80-7d9d-80aa-333333333333')
    await expect(requests[0]?.json()).resolves.toEqual({
      product_name: 'Example product',
      description: 'Description',
      contact_enabled: true,
      contact_description: 'Contact us',
      group_targets: [{ group_did: 'did:wba:awiki.info:group:example', description: 'Join us' }],
    })
  })

  it('maps stable failures without exposing the remote response body', async () => {
    const requests: Request[] = []
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({
      error: { code: 'private_backend_detail', message: 'do not expose this' },
    }, { status: 409 })))

    await expect(client(requests).rotate({
      expectedRevision: 2,
      idempotencyKey: '01991a35-1c80-7d9d-80aa-444444444444',
    })).resolves.toEqual({
      ok: false,
      error: {
        code: 'conflict',
        message: 'Integration 已在其他位置更新，请重新加载后再试。',
      },
    })
  })

  it('rejects oversized input before authentication or transport', async () => {
    const requests: Request[] = []
    const result = await client(requests).create({
      productName: 'x'.repeat(70_000),
      description: '',
      contactEnabled: true,
      contactDescription: '',
      groupTargets: [],
      idempotencyKey: '01991a35-1c80-7d9d-80aa-555555555555',
    })
    expect(result).toEqual({
      ok: false,
      error: { code: 'invalid-request', message: 'Integration 信息不完整或格式不正确。' },
    })
    expect(requests).toHaveLength(0)
  })
})
