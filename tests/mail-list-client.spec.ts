import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  externalHttpAuthError,
  type AwikiExternalHttpAuth,
} from '../src/external-http-auth.ts'
import { AwikiMailListClient } from '../src/mail-list-client.ts'
import { AwikiSdkError } from '../src/sdk-adapter.ts'

function outbound(index: number, createdAt = `2026-09-02T10:${String(index % 60).padStart(2, '0')}:00`) {
  return {
    id: `mail-${index}`,
    direction: 'outbound',
    from_addr: 'alice@example.com',
    to_addr: 'bob@example.com, carol@example.com',
    subject: `Message ${index}`,
    status: 'sent',
    has_attachments: index === 0,
    is_read: true,
    created_at: createdAt,
  }
}

function success(items: readonly ReturnType<typeof outbound>[], total = items.length): Response {
  return Response.json({
    jsonrpc: '2.0',
    id: 1,
    result: { total, page: 1, page_size: 100, items },
    error: null,
  })
}

function client(requests: Request[]): AwikiMailListClient {
  const auth: AwikiExternalHttpAuth = {
    async dispatch(request, transport) {
      requests.push(request.clone())
      return transport(request)
    },
  }
  return new AwikiMailListClient('https://mail.awiki.example', auth)
}

afterEach(() => vi.unstubAllGlobals())

describe('server-authoritative outbound Mail client', () => {
  it('routes sent history only through mail.list(direction=outbound) and preserves server order', async () => {
    const requests: Request[] = []
    vi.stubGlobal('fetch', vi.fn(async () => success([outbound(2), outbound(1), outbound(0)])))

    await expect(client(requests).listOutbound({ folder: 'sent', limit: 20, offset: 0 }))
      .resolves.toEqual({
        items: [2, 1, 0].map(index => expect.objectContaining({
          id: `mail-${index}`,
          folder: 'sent',
          from: ['alice@example.com'],
          to: ['bob@example.com', 'carol@example.com'],
          sentAt: `2026-09-02T10:${String(index).padStart(2, '0')}:00Z`,
          unread: false,
        })),
        hasMore: false,
      })

    expect(requests).toHaveLength(1)
    expect(requests[0]?.url).toBe('https://mail.awiki.example/mail/rpc')
    expect(requests[0]?.method).toBe('POST')
    await expect(requests[0]?.json()).resolves.toEqual({
      jsonrpc: '2.0',
      id: 1,
      method: 'mail.list',
      params: { direction: 'outbound', page: 1, page_size: 100 },
    })
  })

  it.each([
    ['deployed naive seconds', '2026-09-02T10:00:00', '2026-09-02T10:00:00Z'],
    ['deployed naive microseconds', '2026-09-02T10:00:00.123456', '2026-09-02T10:00:00.123456Z'],
    ['UTC marker', '2026-09-02T10:00:00Z', '2026-09-02T10:00:00Z'],
    ['positive offset', '2026-09-02T18:00:00+08:00', '2026-09-02T18:00:00+08:00'],
    ['negative offset', '2026-09-02T04:30:00-05:30', '2026-09-02T04:30:00-05:30'],
    ['valid leap day', '2024-02-29T23:59:59', '2024-02-29T23:59:59Z'],
  ] as const)('normalizes the %s timestamp deterministically', async (_label, input, expected) => {
    const requests: Request[] = []
    vi.stubGlobal('fetch', vi.fn(async () => success([outbound(0, input)])))

    await expect(client(requests).listOutbound({ folder: 'sent' }))
      .resolves.toMatchObject({ items: [{ sentAt: expected }] })
  })

  it.each([
    '0000-01-01T00:00:00',
    '2026-00-01T00:00:00',
    '2026-13-01T00:00:00',
    '2026-02-29T00:00:00',
    '2026-02-30T00:00:00',
    '2026-09-00T00:00:00',
    '2026-09-02T24:00:00',
    '2026-09-02T10:60:00',
    '2026-09-02T10:00:60',
    '2026-09-02T10:00',
    '2026-09-02 10:00:00',
    '2026-09-02T10:00:00.',
    '2026-09-02T10:00:00z',
    '2026-09-02T10:00:00+24:00',
    '2026-09-02T10:00:00+08:60',
  ])('rejects malformed service timestamp %s', async (createdAt) => {
    const requests: Request[] = []
    vi.stubGlobal('fetch', vi.fn(async () => success([outbound(0, createdAt)])))

    await expect(client(requests).listOutbound({ folder: 'sent' }))
      .rejects.toEqual(new AwikiSdkError('remote'))
  })

  it('preserves arbitrary offset pagination with two bounded server pages', async () => {
    const requests: Request[] = []
    const pages = [
      Array.from({ length: 100 }, (_, index) => outbound(index)),
      Array.from({ length: 5 }, (_, index) => outbound(index + 100)),
    ]
    vi.stubGlobal('fetch', vi.fn(async () => success(pages.shift()!, 105)))

    await expect(client(requests).listOutbound({ folder: 'sent', limit: 10, offset: 95 }))
      .resolves.toMatchObject({
        items: Array.from({ length: 10 }, (_, index) => ({ id: `mail-${index + 95}` })),
        hasMore: false,
      })
    await expect(Promise.all(requests.map(request => request.json())))
      .resolves.toEqual([
        expect.objectContaining({ params: { direction: 'outbound', page: 1, page_size: 100 } }),
        expect.objectContaining({ params: { direction: 'outbound', page: 2, page_size: 100 } }),
      ])
  })

  it.each([
    [401, 'not-registered'],
    [503, 'network'],
  ] as const)('keeps HTTP %s as a stable error instead of an empty sent page', async (status, code) => {
    const requests: Request[] = []
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ detail: 'private failure' }, { status })))

    const result = await client(requests).listOutbound({ folder: 'sent', limit: 20, offset: 0 })
      .catch((error: unknown) => error)
    expect(result).toEqual(new AwikiSdkError(code))
    expect(result).not.toMatchObject({ items: [] })
  })

  it('maps JSON-RPC authentication failure and rejects a non-outbound response', async () => {
    const requests: Request[] = []
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(Response.json({
        jsonrpc: '2.0', id: 1, result: null, error: { code: -32000, message: 'private' },
      }))
      .mockResolvedValueOnce(success([{ ...outbound(0), direction: 'inbound' } as never])))

    await expect(client(requests).listOutbound({ folder: 'sent' }))
      .rejects.toEqual(new AwikiSdkError('not-registered'))
    await expect(client(requests).listOutbound({ folder: 'sent' }))
      .rejects.toEqual(new AwikiSdkError('remote'))
  })

  it('maps signed-out Host auth before transport without issuing a request', async () => {
    const auth: AwikiExternalHttpAuth = {
      async dispatch() { throw externalHttpAuthError('signed-out') },
    }
    await expect(new AwikiMailListClient('https://mail.awiki.example', auth).listOutbound({ folder: 'sent' }))
      .rejects.toEqual(new AwikiSdkError('signed-out'))
  })
})
