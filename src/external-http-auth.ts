/** Host-only dispatcher for externally transported ANP-authenticated HTTP. */

import type {
  AwikiSdkClient,
  AwikiSdkExternalHttpAttempt,
  AwikiSdkExternalHttpResponse,
  AwikiSdkHttpHeader,
} from './provider-api.ts'

export const AWIKI_EXTERNAL_HTTP_MAX_BODY_BYTES = 4 * 1024 * 1024

const MANAGED_HEADERS = [
  'authorization',
  'signature-input',
  'signature',
  'content-digest',
] as const

export type AwikiExternalHttpAuthErrorCode =
  | 'not-registered'
  | 'signed-out'
  | 'invalid-request'
  | 'unsupported-body'
  | 'body-too-large'
  | 'auth-state-unavailable'

const ERROR_MESSAGES: Readonly<Record<AwikiExternalHttpAuthErrorCode, string>> = {
  'not-registered': 'A registered AWiki identity is required.',
  'signed-out': 'This installation is signed out of AWiki.',
  'invalid-request': 'The external HTTP request is invalid.',
  'unsupported-body': 'The external HTTP request body cannot be replayed safely.',
  'body-too-large': 'The external HTTP request body exceeds 4 MiB.',
  'auth-state-unavailable': 'AWiki external HTTP authentication is unavailable.',
}

/** Stable Host-only failure without request, response, credential, or path detail. */
export class AwikiExternalHttpAuthError extends Error {
  public readonly name = 'AwikiExternalHttpAuthError'

  public constructor(public readonly code: AwikiExternalHttpAuthErrorCode) {
    super(ERROR_MESSAGES[code])
  }
}

export type AwikiHttpTransport = (request: Request) => Promise<Response>

/** Trusted same-process API; never expose this interface through Remote or tools. */
export interface AwikiExternalHttpAuth {
  dispatch(request: Request, transport: AwikiHttpTransport): Promise<Response>
}

export interface AwikiExternalHttpAuthSession {
  readonly client: AwikiSdkClient
  assertActive(): Promise<void>
}

export function createAwikiExternalHttpAuth(
  acquire: () => Promise<AwikiExternalHttpAuthSession>,
): AwikiExternalHttpAuth {
  return Object.freeze({
    async dispatch(request: Request, transport: AwikiHttpTransport): Promise<Response> {
      validateDispatchInput(request, transport)
      const session = await acquire()
      await session.assertActive()
      const body = await readReplayableBody(request)
      await session.assertActive()
      let attempt: AwikiSdkExternalHttpAttempt
      try {
        attempt = await session.client.prepareExternalHttpRequest({
          url: request.url,
          method: request.method,
          headers: requestHeaders(request),
          ...body === undefined ? {} : { body },
        })
      } catch (error) {
        throw mapProviderError(error)
      }
      await session.assertActive()

      const response = await transport(authenticatedRequest(request, body, attempt))
      const retry = await handleResponseWithoutChangingCompletedRequest(attempt, response)
      if (retry === null) return response

      try {
        await session.assertActive()
      } catch {
        return response
      }
      const retriedResponse = await transport(authenticatedRequest(request, body, retry))
      await handleResponseWithoutChangingCompletedRequest(retry, retriedResponse)
      return retriedResponse
    },
  })
}

export function externalHttpAuthError(code: AwikiExternalHttpAuthErrorCode): AwikiExternalHttpAuthError {
  return new AwikiExternalHttpAuthError(code)
}

export function mapProviderError(error: unknown): AwikiExternalHttpAuthError {
  if (error instanceof AwikiExternalHttpAuthError) return error
  try {
    if (typeof error === 'object' && error !== null) {
      const value = error as { readonly name?: unknown; readonly code?: unknown }
      if (value.name === 'AwikiSdkError') {
        if (value.code === 'not-registered') return externalHttpAuthError('not-registered')
        if (value.code === 'invalid-request') return externalHttpAuthError('invalid-request')
      }
    }
  } catch {}
  return externalHttpAuthError('auth-state-unavailable')
}

function validateDispatchInput(request: Request, transport: AwikiHttpTransport): void {
  if (!(request instanceof Request) || typeof transport !== 'function' || request.bodyUsed) {
    throw externalHttpAuthError('invalid-request')
  }
  for (const name of MANAGED_HEADERS) {
    if (request.headers.has(name)) throw externalHttpAuthError('invalid-request')
  }
}

async function readReplayableBody(request: Request): Promise<Uint8Array | undefined> {
  if (request.body === null) return undefined
  let clone: Request
  try {
    clone = request.clone()
  } catch {
    throw externalHttpAuthError('unsupported-body')
  }
  const stream = clone.body
  if (stream === null) return new Uint8Array()
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const result = await reader.read()
      if (result.done) break
      length += result.value.byteLength
      if (length > AWIKI_EXTERNAL_HTTP_MAX_BODY_BYTES) {
        void reader.cancel().catch(() => {})
        void request.body?.cancel().catch(() => {})
        throw externalHttpAuthError('body-too-large')
      }
      chunks.push(Uint8Array.from(result.value))
    }
  } catch (error) {
    if (error instanceof AwikiExternalHttpAuthError) throw error
    throw externalHttpAuthError('unsupported-body')
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

function requestHeaders(request: Request): AwikiSdkHttpHeader[] {
  return [...request.headers].map(([name, value]) => ({ name, value }))
}

function authenticatedRequest(
  original: Request,
  body: Uint8Array | undefined,
  attempt: AwikiSdkExternalHttpAttempt,
): Request {
  const headers = new Headers(original.headers)
  for (const header of attempt.headerPatch) headers.set(header.name, header.value)
  const init: RequestInit = {
    method: attempt.method,
    headers,
    redirect: 'manual',
    signal: original.signal,
    cache: original.cache,
    credentials: original.credentials,
    integrity: original.integrity,
    keepalive: original.keepalive,
    mode: original.mode,
    referrer: original.referrer,
    referrerPolicy: original.referrerPolicy,
    ...body === undefined ? {} : { body: Uint8Array.from(body) },
  }
  try {
    return new Request(attempt.targetUrl, init)
  } catch {
    throw externalHttpAuthError('invalid-request')
  }
}

async function handleResponseWithoutChangingCompletedRequest(
  attempt: AwikiSdkExternalHttpAttempt,
  response: Response,
): Promise<AwikiSdkExternalHttpAttempt | null> {
  try {
    return await attempt.handleResponse(responseMetadata(response))
  } catch {
    // The transport has already completed and may have executed a non-idempotent
    // operation. Never turn post-response auth bookkeeping into a replay signal.
    return null
  }
}

function responseMetadata(response: Response): AwikiSdkExternalHttpResponse {
  const headers: AwikiSdkHttpHeader[] = []
  for (const name of ['authentication-info', 'www-authenticate', 'accept-signature'] as const) {
    const value = response.headers.get(name)
    if (value !== null) headers.push({ name, value })
  }
  return { statusCode: response.status, headers }
}
