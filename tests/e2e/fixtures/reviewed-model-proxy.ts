/** Fail-closed check that the reviewed Model candidate matches tenant server-info. */

const SERVER_INFO_RESPONSE_MAX_BYTES = 64 * 1024

export function reviewedModelProxyAllowsLoopback(raw: string): boolean {
  try {
    const url = new URL(raw)
    return url.protocol === 'http:' && ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(url.hostname)
  } catch {
    return false
  }
}

export function canonicalModelProxyUrl(raw: string): string {
  const url = new URL(raw)
  if (url.username !== '' || url.password !== '' || url.search !== '' || url.hash !== '') {
    throw new Error('DSH E2E reviewed Model Proxy URL is invalid')
  }
  if (url.protocol !== 'https:' && !reviewedModelProxyAllowsLoopback(raw)) {
    throw new Error('DSH E2E reviewed Model Proxy URL is invalid')
  }
  return url.toString().replace(/\/$/u, '')
}

export function advertisedModelProxyBaseUrl(
  serverInfo: unknown,
  allowInsecureLoopbackForTesting: boolean,
): string | undefined {
  if (typeof serverInfo !== 'object' || serverInfo === null || Array.isArray(serverInfo)) return undefined
  const document = serverInfo as { readonly schema_version?: unknown; readonly services?: unknown }
  if (document.schema_version !== 1) return undefined
  const services = document.services
  if (typeof services !== 'object' || services === null || Array.isArray(services)) return undefined
  const candidate = (services as Record<string, unknown>).model_proxy
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) return undefined
  const value = candidate as { readonly enabled?: unknown; readonly base_url?: unknown }
  if (value.enabled !== true || typeof value.base_url !== 'string') return undefined
  try {
    const url = new URL(value.base_url)
    const loopback = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname)
    if (url.protocol !== 'https:' && !(allowInsecureLoopbackForTesting && url.protocol === 'http:' && loopback)) {
      return undefined
    }
    if (url.username !== '' || url.password !== '' || url.hash !== '' || url.search !== '') return undefined
    return canonicalModelProxyUrl(value.base_url)
  } catch {
    return undefined
  }
}

export async function assertReviewedModelProxyAdvertisement(input: {
  readonly userServiceUrl: string
  readonly reviewedModelProxyUrl: string
  readonly fetchImpl?: typeof fetch
}): Promise<string> {
  const expected = canonicalModelProxyUrl(input.reviewedModelProxyUrl)
  const endpoint = new URL('/user-service/v1/server-info', input.userServiceUrl)
  endpoint.searchParams.set('client_platform', 'dsh')
  const fetchImpl = input.fetchImpl ?? fetch
  const response = await fetchImpl(endpoint, {
    method: 'GET',
    headers: { accept: 'application/json', 'cache-control': 'no-store' },
    cache: 'no-store',
    redirect: 'error',
  })
  if (!response.ok) throw new Error('DSH E2E reviewed Model Proxy advertisement is unavailable')
  const text = await response.text()
  if (Buffer.byteLength(text, 'utf8') > SERVER_INFO_RESPONSE_MAX_BYTES) {
    throw new Error('DSH E2E reviewed Model Proxy advertisement is unavailable')
  }
  let decoded: unknown
  try {
    decoded = JSON.parse(text) as unknown
  } catch {
    throw new Error('DSH E2E reviewed Model Proxy advertisement is unavailable')
  }
  const advertised = advertisedModelProxyBaseUrl(
    decoded,
    reviewedModelProxyAllowsLoopback(input.reviewedModelProxyUrl),
  )
  if (advertised === undefined || advertised !== expected) {
    throw new Error('DSH E2E reviewed Model Proxy URL does not match tenant server-info')
  }
  return advertised
}
