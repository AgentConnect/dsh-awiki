import { describe, expect, it, vi } from 'vitest'
import {
  advertisedModelProxyBaseUrl,
  assertReviewedModelProxyAdvertisement,
  canonicalModelProxyUrl,
  reviewedModelProxyAllowsLoopback,
} from './e2e/fixtures/reviewed-model-proxy.ts'

function serverInfo(modelBaseUrl: string, enabled = true): unknown {
  return {
    schema_version: 1,
    services: {
      model_proxy: { enabled, base_url: modelBaseUrl },
      guest_gateway: { enabled: true, base_url: 'http://127.0.0.1:19191' },
    },
  }
}

describe('reviewed Model Proxy advertisement contract', () => {
  it('treats only loopback HTTP as a test-only Model candidate', () => {
    expect(reviewedModelProxyAllowsLoopback('http://127.0.0.1:19090')).toBe(true)
    expect(reviewedModelProxyAllowsLoopback('https://model.awiki.info')).toBe(false)
    expect(reviewedModelProxyAllowsLoopback('http://model.awiki.info')).toBe(false)
  })

  it('accepts the advertised Model Proxy only when it matches the reviewed candidate', () => {
    expect(advertisedModelProxyBaseUrl(serverInfo('https://model.awiki.info/'), false))
      .toBe('https://model.awiki.info')
    expect(advertisedModelProxyBaseUrl(serverInfo('http://127.0.0.1:19090'), true))
      .toBe('http://127.0.0.1:19090')
    expect(advertisedModelProxyBaseUrl(serverInfo('http://127.0.0.1:19090'), false)).toBeUndefined()
    expect(advertisedModelProxyBaseUrl(serverInfo('http://model.awiki.info'), true)).toBeUndefined()
  })

  it('fail-closes when tenant server-info advertises a different Model Proxy', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(serverInfo('https://model.awiki.info')), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof fetch
    await expect(assertReviewedModelProxyAdvertisement({
      userServiceUrl: 'https://awiki.info',
      reviewedModelProxyUrl: 'http://127.0.0.1:19090',
      fetchImpl,
    })).rejects.toThrow('does not match tenant server-info')
    await expect(assertReviewedModelProxyAdvertisement({
      userServiceUrl: 'https://awiki.info',
      reviewedModelProxyUrl: 'https://model.awiki.info',
      fetchImpl,
    })).resolves.toBe('https://model.awiki.info')
    expect(canonicalModelProxyUrl('https://model.awiki.info/')).toBe('https://model.awiki.info')
  })
})
