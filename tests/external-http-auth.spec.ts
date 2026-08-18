import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import {
  AwikiExternalHttpAuthError,
  type AwikiHttpTransport,
} from '../src/index.ts'
import type {
  AwikiSdkExternalHttpAttempt,
  AwikiSdkExternalHttpRequest,
  AwikiSdkExternalHttpResponse,
} from '../src/provider-api.ts'
import { AWIKI_LOGOUT_CONFIRMATION } from '../src/types.ts'
import { setup } from './harness.ts'

describe('AWiki external HTTP authentication dispatcher', () => {
  it('buffers exact bytes, forces manual redirect, observes auth headers, and preserves the response body', async () => {
    const harness = await setup()
    try {
      const request = new Request('https://api.example.test/orders?view=full', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-business': 'kept' },
        body: '{"productId":"123"}',
      })
      let sent: Request | undefined
      const response = await harness.ctx.awiki.externalHttpAuth.dispatch(request, async authenticated => {
        sent = authenticated
        expect(authenticated.redirect).toBe('manual')
        expect(authenticated.headers.get('signature')).toBe('sig1=:fixture:')
        expect(authenticated.headers.get('x-business')).toBe('kept')
        expect(await authenticated.clone().text()).toBe('{"productId":"123"}')
        return new Response('completed', {
          status: 200,
          headers: {
            'Authentication-Info': 'access_token="private-token", token_type="Bearer"',
            'X-Response-Private': 'must-not-cross-provider-boundary',
          },
        })
      })

      expect(sent).toBeDefined()
      expect(harness.client.externalHttpRequests).toHaveLength(1)
      expect(Buffer.from(harness.client.externalHttpRequests[0]!.body!).toString()).toBe('{"productId":"123"}')
      expect(harness.client.externalHttpResponses).toEqual([{
        statusCode: 200,
        headers: [{
          name: 'authentication-info',
          value: 'access_token="private-token", token_type="Bearer"',
        }],
      }])
      expect(response.bodyUsed).toBe(false)
      await expect(response.text()).resolves.toBe('completed')
    } finally {
      await harness.ctx.fiber.dispose()
    }
  })

  it('sends exactly one retry with identical body bytes and the retry header patch', async () => {
    const harness = await setup()
    try {
      const handled: AwikiSdkExternalHttpResponse[] = []
      const attempt = (
        request: AwikiSdkExternalHttpRequest,
        retryCount: number,
      ): AwikiSdkExternalHttpAttempt => ({
        targetUrl: request.url,
        method: request.method,
        headerPatch: [{
          name: 'Signature',
          value: retryCount === 0 ? 'sig1=:initial:' : 'sig1=:retry:',
        }],
        retryCount,
        async handleResponse(response) {
          handled.push(response)
          return retryCount === 0 && response.statusCode === 401
            ? attempt(request, 1)
            : null
        },
      })
      harness.client.externalHttpFactory = request => attempt(request, 0)
      const bodies: string[] = []
      const signatures: (string | null)[] = []
      let calls = 0
      const response = await harness.ctx.awiki.externalHttpAuth.dispatch(
        new Request('https://api.example.test/orders', {
          method: 'POST',
          body: 'same-body',
        }),
        async authenticated => {
          calls += 1
          bodies.push(await authenticated.clone().text())
          signatures.push(authenticated.headers.get('signature'))
          return calls === 1
            ? new Response(null, {
                status: 401,
                headers: {
                  'WWW-Authenticate': 'DIDWba realm="api.example.test", error="invalid_signature"',
                  'Accept-Signature': 'sig1=("@method" "@target-uri" "@authority" "content-digest")',
                },
              })
            : new Response('accepted', { status: 200 })
        },
      )

      expect(calls).toBe(2)
      expect(bodies).toEqual(['same-body', 'same-body'])
      expect(signatures).toEqual(['sig1=:initial:', 'sig1=:retry:'])
      expect(handled.map(item => item.statusCode)).toEqual([401, 200])
      await expect(response.text()).resolves.toBe('accepted')
    } finally {
      await harness.ctx.fiber.dispose()
    }
  })

  it('propagates the exact transport rejection without wrapping it', async () => {
    const harness = await setup()
    try {
      const failure = new Error('custom transport failure')
      const transport: AwikiHttpTransport = () => Promise.reject(failure)
      await expect(harness.ctx.awiki.externalHttpAuth.dispatch(
        new Request('https://api.example.test/orders'),
        transport,
      )).rejects.toBe(failure)
    } finally {
      await harness.ctx.fiber.dispose()
    }
  })

  it('returns an already completed response when post-response auth bookkeeping fails', async () => {
    const harness = await setup()
    try {
      harness.client.externalHttpFactory = request => ({
        targetUrl: request.url,
        method: request.method,
        headerPatch: [{ name: 'Signature', value: 'sig1=:initial:' }],
        retryCount: 0,
        handleResponse: () => Promise.reject(new Error('private auth state failure')),
      })
      let calls = 0
      const response = await harness.ctx.awiki.externalHttpAuth.dispatch(
        new Request('https://api.example.test/non-idempotent', { method: 'POST', body: 'execute-once' }),
        async () => {
          calls += 1
          return new Response('committed', { status: 201 })
        },
      )
      expect(calls).toBe(1)
      await expect(response.text()).resolves.toBe('committed')
    } finally {
      await harness.ctx.fiber.dispose()
    }
  })

  it('fails before transport for managed headers, consumed bodies, oversized bodies, and inactive sessions', async () => {
    const harness = await setup()
    try {
      let calls = 0
      const transport = async () => {
        calls += 1
        return new Response(null, { status: 200 })
      }
      const managed = new Request('https://api.example.test/orders', {
        headers: { Authorization: 'Bearer caller-owned' },
      })
      await expectCode(harness.ctx.awiki.externalHttpAuth.dispatch(managed, transport), 'invalid-request')

      const consumed = new Request('https://api.example.test/orders', { method: 'POST', body: 'used' })
      await consumed.text()
      await expectCode(harness.ctx.awiki.externalHttpAuth.dispatch(consumed, transport), 'invalid-request')

      const oversized = new Request('https://api.example.test/orders', {
        method: 'POST',
        body: new Uint8Array(4 * 1024 * 1024 + 1),
      })
      await expectCode(harness.ctx.awiki.externalHttpAuth.dispatch(oversized, transport), 'body-too-large')

      const identity = harness.client.identity
      harness.client.identity = null
      await expectCode(
        harness.ctx.awiki.externalHttpAuth.dispatch(new Request('https://api.example.test/orders'), transport),
        'not-registered',
      )
      harness.client.identity = identity
      await harness.ctx.awiki.logout({ confirmation: AWIKI_LOGOUT_CONFIRMATION })
      await expectCode(
        harness.ctx.awiki.externalHttpAuth.dispatch(new Request('https://api.example.test/orders'), transport),
        'signed-out',
      )
      expect(calls).toBe(0)
    } finally {
      await harness.ctx.fiber.dispose()
    }
  })

  it('fails closed before transport after the provider is disposed', async () => {
    const harness = await setup()
    try {
      await harness.providerFiber.dispose()
      let called = false
      await expectCode(
        harness.ctx.awiki.externalHttpAuth.dispatch(
          new Request('https://api.example.test/orders'),
          async () => {
            called = true
            return new Response()
          },
        ),
        'auth-state-unavailable',
      )
      expect(called).toBe(false)
    } finally {
      await harness.ctx.fiber.dispose()
    }
  })

  it('does not expose the Host-only dispatcher through Remote, tools, or the browser client', async () => {
    for (const path of [
      'src/types.ts',
      'src/tools.ts',
      'src/client/index.ts',
      'lib/typert.host.d.ts',
      'lib/typert.remote-client.d.ts',
    ]) {
      expect(await readFile(new URL(`../${path}`, import.meta.url), 'utf8')).not.toContain('externalHttpAuth')
    }
  })
})

async function expectCode(
  promise: Promise<unknown>,
  code: AwikiExternalHttpAuthError['code'],
): Promise<void> {
  await expect(promise).rejects.toMatchObject({
    name: 'AwikiExternalHttpAuthError',
    code,
  })
}
