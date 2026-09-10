/** Keep AWiki settings local while using Connection's authenticated Fetch carrier. */
import type { ConnectionRpcHandler, HostConnectionHandle } from '@deepseek-ai/dsh-client-connection'
import { AWIKI_SETTINGS_RPC_CHANNEL, AWIKI_SETTINGS_RPC_ENDPOINTS } from './settings-rpc-contract.ts'

/** Register exact buffered routes; Connection applies authentication before dispatch. */
export function registerAwikiSettingsTransport(
  connection: Pick<HostConnectionHandle, 'fetch'>,
  handler: ConnectionRpcHandler,
): void {
  registerAwikiLoopbackRpc(connection, AWIKI_SETTINGS_RPC_CHANNEL, Object.values(AWIKI_SETTINGS_RPC_ENDPOINTS), handler)
}

/** Shared carrier for the AWiki and Model Proxy plugin-owned local operations. */
export function registerAwikiLoopbackRpc(
  connection: Pick<HostConnectionHandle, 'fetch'>,
  channel: string,
  endpoints: readonly string[],
  handler: ConnectionRpcHandler,
): void {
  for (const endpoint of endpoints) {
    connection.fetch.register({
      path: `${channel}/${endpoint}`,
      methods: ['POST'],
      requestBody: 'buffered',
      async fetch(request) {
        // Authentication alone also permits trusted LAN clients. Keep this
        // plugin's settings surface limited to the loopback page authority.
        const url = new URL(request.url)
        if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
          return new Response('forbidden', { status: 403 })
        }
        if (request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() !== 'application/json') {
          return new Response('unsupported content type', { status: 415 })
        }
        let body: unknown
        try { body = await request.json() } catch {
          return new Response('invalid request', { status: 400 })
        }
        if (typeof body !== 'object' || body === null || Array.isArray(body)) {
          return new Response('invalid request', { status: 400 })
        }
        const envelope = body as Record<string, unknown>
        if (Object.keys(envelope).sort().join(',') !== 'method,payload,rpcId,type'
          || envelope.type !== 'client-request' || envelope.method !== endpoint
          || typeof envelope.rpcId !== 'string' || envelope.rpcId.length === 0 || envelope.rpcId.length > 256) {
          return new Response('invalid request', { status: 400 })
        }
        try {
          const result = await handler(endpoint, envelope.payload, request.signal)
          return Response.json({ type: 'server-response', rpcId: envelope.rpcId, result })
        } catch {
          return new Response('AWiki settings unavailable', { status: 500 })
        }
      },
    })
  }
}
