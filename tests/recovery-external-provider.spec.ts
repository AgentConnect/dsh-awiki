import { Context } from '@deepseek-ai/cordis'
import AnpIdentityService from '@agent-network-protocol/dsh-anp-identity'
import { openNativeProvider } from '@agent-network-protocol/dsh-anp-identity/provider'
import type {
  HostProviderLease,
  NativeProviderRegistry,
} from '@agent-network-protocol/dsh-anp-identity/provider-api'
import {
  openImCoreNodeClient,
  type ImCoreNodeClient,
} from '../../awiki-cli-rs2/packages/awiki-im-core-node/dist/index.js'
import { createServer, type Server } from 'node:http'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RustSdkAdapter } from '../src/sdk-adapter.ts'

const PROVIDER_CAPABILITIES = [
  'IDENTITY_READ',
  'IDENTITY_CREATE',
  'IDENTITY_IMPORT',
  'IDENTITY_SIGN',
  'IDENTITY_ECDH_SEALED',
  'IDENTITY_DOCUMENT_UPDATE',
  'IDENTITY_KEY_LIFECYCLE',
  'IDENTITY_DELETE',
  'IDENTITY_HTTP_SIGNATURE',
  'AWIKI_LEGACY_ROOT_TRANSFER_V1',
] as const

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('DSH Recovery through the external identity provider', () => {
  it('clears an orphaned provider identity after the Core profile state is removed', {
    timeout: 60_000,
  }, async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-awiki-orphaned-provider-'))
    const identityRoot = join(root, 'identity')
    const coreRoot = join(root, 'core')
    const remote = await recoveryService()
    const identity = await identityService(identityRoot)
    let lease: HostProviderLease | undefined
    let client: ImCoreNodeClient | undefined
    let adapter: RustSdkAdapter | undefined
    try {
      lease = acquireAwikiLease(identity.ctx)
      client = await openImCoreNodeClient(coreOptions(coreRoot, remote.baseUrl, lease))
      adapter = new RustSdkAdapter(client)

      await adapter.sendRegistrationOtp({ handle: 'alice', phone: '+8613800000000' })
      await expect(adapter.registerIdentity({
        handle: 'alice',
        phone: '+8613800000000',
        otp: '123456',
      })).resolves.toMatchObject({ status: 'registered' })
      expect(await lease.list()).toHaveLength(1)

      await adapter.dispose()
      adapter = undefined
      client = undefined
      await rm(coreRoot, { recursive: true, force: true })

      client = await openImCoreNodeClient(coreOptions(coreRoot, remote.baseUrl, lease))
      adapter = new RustSdkAdapter(client)
      await expect(adapter.getIdentity()).resolves.toBeNull()
      expect(await lease.list()).toHaveLength(1)

      await expect(adapter.clearLocalData()).resolves.toEqual({ cleared: true })
      expect(await lease.list()).toEqual([])
      expect(remote.errors, remote.errors.join(' | ')).toEqual([])
    }
    finally {
      await adapter?.dispose()
      lease?.dispose()
      await identity.dispose()
      await remote.close()
      await rm(root, { recursive: true, force: true })
    }
  })

  it('resumes one identity_transition_pending operation in place after Core and Host lease restart', {
    timeout: 60_000,
  }, async () => {
    vi.stubEnv('AWIKI_DID_TRANSITION_VNEXT_HIDDEN_ROLLOUT_ENABLED', '1')
    const root = await mkdtemp(join(tmpdir(), 'dsh-awiki-recovery-provider-'))
    const identityRoot = join(root, 'identity')
    const coreRoot = join(root, 'core')
    const remote = await recoveryService()
    const identity = await identityService(identityRoot)
    let lease: HostProviderLease | undefined
    let client: ImCoreNodeClient | undefined
    let adapter: RustSdkAdapter | undefined
    try {
      lease = acquireAwikiLease(identity.ctx)
      client = await openImCoreNodeClient(coreOptions(coreRoot, remote.baseUrl, lease))
      adapter = new RustSdkAdapter(client)

      await adapter.sendRegistrationOtp({ handle: 'alice', phone: '+8613800000000' })
      const registered = await adapter.registerIdentity({
        handle: 'alice',
        phone: '+8613800000000',
        otp: '123456',
      })
      expect(registered.status).toBe('registered')
      if (registered.status !== 'registered') throw new Error('fixture registration did not finish')
      const predecessorDid = registered.identity.did
      remote.bindCurrentIdentity(predecessorDid)
      const registeredRegistry = JSON.parse(await readFile(join(coreRoot, 'identities/registry.json'), 'utf8')) as {
        credentials: Record<string, { did: string; full_handle?: string }>
      }
      expect(Object.entries(registeredRegistry.credentials).map(([alias, entry]) => ({
        alias,
        did: entry.did,
        fullHandle: entry.full_handle,
      }))).toEqual([{ alias: 'default', did: predecessorDid, fullHandle: 'alice.awiki.test' }])
      await adapter.syncDeviceManagement()

      const otp = await adapter.sendRecoveryOtp({
        fullHandle: 'alice.awiki.test',
        phone: '+8613800000000',
      })
      const prepared = await adapter.prepareRecovery({
        operationId: otp.operationId,
        phone: '+8613800000000',
        otp: '654321',
      })
      expect(prepared.phase).toBe('ready_to_commit')
      expect(prepared.previousDid).toBe(predecessorDid)

      remote.failNextRecoveredGetMe()
      await expect(adapter.activateRecovery({ operationId: otp.operationId }))
        .rejects.toMatchObject({ name: 'AwikiSdkError' })
      expect(remote.errors, remote.errors.join(' | ')).toEqual([])
      expect(remote.commitOperationIds).toEqual([otp.operationId])
      await expect(adapter.getRecoveryStatus({ operationId: otp.operationId }))
        .resolves.toMatchObject({
          operationId: otp.operationId,
          previousDid: predecessorDid,
          phase: 'identity_transition_pending',
          retryable: true,
        })

      const identitiesBeforeRestart = await lease.list()
      expect(identitiesBeforeRestart).toHaveLength(2)
      const successorDid = identitiesBeforeRestart
        .map(value => value.reference.did)
        .find(did => did !== predecessorDid)
      expect(successorDid).toBeDefined()
      const registry = JSON.parse(await readFile(join(coreRoot, 'identities/registry.json'), 'utf8')) as {
        credentials: Record<string, { did: string; full_handle?: string }>
      }
      expect(Object.entries(registry.credentials).map(([alias, entry]) => ({
        alias,
        did: entry.did,
        fullHandle: entry.full_handle,
      }))).toEqual([{ alias: 'default', did: successorDid, fullHandle: 'alice.awiki.test' }])

      await adapter.dispose()
      adapter = undefined
      client = undefined
      lease.dispose()
      lease = undefined

      lease = acquireAwikiLease(identity.ctx)
      client = await openImCoreNodeClient(coreOptions(coreRoot, remote.baseUrl, lease))
      adapter = new RustSdkAdapter(client)
      await expect(adapter.getRecoveryStatus({ operationId: otp.operationId }))
        .resolves.toMatchObject({
          currentDid: successorDid,
          phase: 'identity_transition_pending',
        })
      await expect(adapter.resumeRecovery({ operationId: otp.operationId }))
        .resolves.toMatchObject({
          operationId: otp.operationId,
          previousDid: predecessorDid,
          currentDid: successorDid,
          phase: 'applied',
          retryable: false,
        })

      const recovered = await adapter.getIdentity()
      expect(recovered).toMatchObject({
        handle: 'alice.awiki.test',
        did: successorDid,
      })
      expect(await lease.list()).toHaveLength(2)
      expect(remote.commitOperationIds).toEqual([otp.operationId])
      expect(remote.prekeyOwners).toContain(successorDid)
    }
    finally {
      await adapter?.dispose()
      lease?.dispose()
      await identity.dispose()
      await remote.close()
      await rm(root, { recursive: true, force: true })
    }
  })
})

function acquireAwikiLease(ctx: Context): HostProviderLease {
  return ctx.anpIdentity.acquireProvider({
    consumer: '@awiki/dsh-plugin',
    capabilities: [...PROVIDER_CAPABILITIES],
    ttlSeconds: 600,
  })
}

function coreOptions(stateRoot: string, endpoint: string, identityProvider: HostProviderLease) {
  return {
    stateRoot,
    serviceBaseUrl: endpoint,
    didDomain: 'awiki.test',
    userServiceEndpoint: endpoint,
    messageServiceEndpoint: endpoint,
    anpServiceEndpoint: endpoint,
    operationTimeoutMs: 5_000,
    syncTimeoutMs: 1_000,
    multiDeviceHandleRecoveryEnabled: true,
    multiDeviceAudience: 'awiki-user-service',
    externalHttpAllowInsecureLoopbackForTesting: true,
    identityProvider,
  }
}

async function identityService(stateRoot: string) {
  const ctx = new Context()
  await ctx.plugin(AnpIdentityService, {
    stateRoot,
    allowConsumers: ['@awiki/dsh-plugin'],
    allowProviderConsumers: ['@awiki/dsh-plugin'],
  })
  const registration = await openNativeProvider({
    stateRoot,
    rootKeyProvider: 'injected',
    rootKeyProviderId: 'phase4-dsh-test-root',
    injectedRootKey: Buffer.alloc(32, 41),
  })
  const unregister = (ctx.anpIdentity as unknown as NativeProviderRegistry)
    .registerProvider(registration)
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if ((await ctx.anpIdentity.health()).status !== 'unavailable') {
      return {
        ctx,
        async dispose() {
          await unregister()
          await ctx.fiber.dispose()
        },
      }
    }
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  await unregister()
  await ctx.fiber.dispose()
  throw new Error('ANP Identity Provider did not become ready')
}

interface RecoveryService {
  readonly baseUrl: string
  readonly commitOperationIds: string[]
  readonly prekeyOwners: string[]
  readonly errors: string[]
  bindCurrentIdentity(did: string): void
  failNextRecoveredGetMe(): void
  close(): Promise<void>
}

async function recoveryService(): Promise<RecoveryService> {
  let currentDid = ''
  let currentDocument: Record<string, unknown> | undefined
  let currentUserId = ''
  let failRecoveredGetMe = false
  let recovered = false
  const commitOperationIds: string[] = []
  const prekeyOwners: string[] = []
  const errors: string[] = []
  const server = createServer(async (request, response) => {
    try {
      const rpc = await readRpc(request)
      let result: unknown
      if (request.url === '/user-service/v1/handle/rpc') {
        result = {
          ok: true,
          retry_after_seconds: 60,
          retry_at: '2099-08-26T12:00:00Z',
        }
      }
      else if (request.url === '/user-service/v1/auth/handle-recovery/v4/exchange') {
        if (currentDid.length === 0) throw new Error('registration did not establish current DID')
        sendJsonResponse(response, {
          contract_version: 'awiki.handle-recovery.v1.contract.4.20260807',
          recovery_grant: 'phase4-dsh-recovery-grant',
          purpose: 'awiki.identity.handle-recovery.v1',
          expires_at: '2099-08-26T12:05:00Z',
          current_binding: {
            account_user_id: currentUserId,
            full_handle: 'alice.awiki.test',
            current_did: currentDid,
            binding_generation: '1',
          },
        })
        return
      }
      else if (rpc.method === 'register') {
        const document = rpc.params.did_document as Record<string, unknown>
        const device = manifestDevice(document)
        currentDocument = document
        currentDid = requiredString(document.id)
        currentUserId = 'phase4-dsh-user'
        result = {
          state: 'registered',
          did: currentDid,
          user_id: currentUserId,
          message: 'Registration successful',
          access_token: accessToken(currentDid, currentUserId, device),
          handle: 'alice',
          domain: 'awiki.test',
          full_handle: 'alice.awiki.test',
          binding_generation: '1',
        }
      }
      else if (rpc.method === 'handle_recovery_commit_v4') {
        const intent = rpc.params.intent as Record<string, unknown>
        const successor = rpc.params.new_did_document as Record<string, unknown>
        const operationId = requiredString(intent.operation_id)
        const successorDid = requiredString(intent.new_did)
        commitOperationIds.push(operationId)
        currentDid = successorDid
        currentDocument = successor
        recovered = true
        result = {
          state: 'recovered',
          operation_id: operationId,
          intent_hash: requiredString(rpc.params.intent_hash),
          intent_schema_version: '1',
          contract_version: 'awiki.handle-recovery.v1.contract.4.20260807',
          account_user_id: currentUserId,
          full_handle: 'alice.awiki.test',
          previous_did: requiredString(intent.expected_previous_did),
          current_did: successorDid,
          binding_generation: '2',
          checkpoint: {
            document_version: 2,
            document_hash: documentHash(successor),
            registry_version: 2,
          },
          bootstrap_device: {
            device_id: requiredString(intent.bootstrap_device_id),
            status: 'active',
            role: 'admin',
            management_ready: true,
            auth_generation: 1,
          },
          committed_at: '2026-08-26T12:00:00Z',
        }
      }
      else if (rpc.method === 'get_me') {
        if (recovered && failRecoveredGetMe) {
          failRecoveredGetMe = false
          response.writeHead(503, { connection: 'close' })
          response.end()
          return
        }
        if (currentDocument === undefined) throw new Error('current document is absent')
        result = {
          did: currentDid,
          user_id: currentUserId,
          access_token: accessToken(currentDid, currentUserId, manifestDevice(currentDocument)),
        }
      }
      else if (rpc.method === 'anp.get_capabilities') {
        result = {
          supported_profiles: [
            'awiki.message-sync.explicit-negotiation.v1',
            'sync.snapshot_paging.v1',
          ],
        }
      }
      else if (rpc.method === 'sync.bootstrap') {
        if (currentDocument === undefined) throw new Error('current document is absent')
        result = {
          mode: 'tail_only',
          account_id: currentUserId,
          device_id: manifestDevice(currentDocument).device_id,
          server_time: '2026-08-26T12:00:00Z',
          cursor: { stream_epoch: '1', scan_seq: '0' },
          read_state_baseline: [],
          group_state_baseline: [],
          snapshot_capability: { schema: 3, delivery: 'paged_v1' },
          warnings: [],
          snapshot_capability: { schema: 3, delivery: 'paged_v1' },
          sync_capabilities: [],
        }
      }
      else if (rpc.method === 'sync.delta') {
        const body = rpc.params.body as {
          cursor: { stream_epoch: string; scan_seq: string }
        }
        result = {
          mode: 'delta',
          server_time: '2026-08-26T12:00:01Z',
          events: [],
          next_cursor: body.cursor,
          has_more: false,
          warnings: [],
          recovery: null,
        }
      }
      else if (rpc.method === 'direct.e2ee.publish_prekey_bundle') {
        const body = rpc.params.body as {
          prekey_bundle: {
            owner_did: string
            owner_device_id: string
            bundle_id: string
          }
          one_time_prekeys: unknown[]
        }
        prekeyOwners.push(body.prekey_bundle.owner_did)
        result = {
          published: true,
          owner_did: body.prekey_bundle.owner_did,
          owner_device_id: body.prekey_bundle.owner_device_id,
          bundle_id: body.prekey_bundle.bundle_id,
          published_at: '2026-08-26T12:00:01Z',
          published_opk_count: body.one_time_prekeys.length,
        }
      }
      else {
        throw new Error(`unexpected recovery fixture RPC: ${request.url} ${rpc.method}`)
      }
      sendRpcResult(response, rpc.id, result)
    }
    catch (error) {
      errors.push(error instanceof Error ? error.message : 'fixture failure')
      response.writeHead(500, { connection: 'close' })
      response.end(error instanceof Error ? error.message : 'fixture failure')
    }
  })
  const baseUrl = await listen(server)
  return {
    baseUrl,
    commitOperationIds,
    prekeyOwners,
    errors,
    bindCurrentIdentity(did) {
      if (currentDid !== did) throw new Error('registered DID does not match adapter projection')
    },
    failNextRecoveredGetMe() {
      failRecoveredGetMe = true
    },
    close: () => closeServer(server),
  }
}

interface RpcRequest {
  readonly id: string | number
  readonly method: string
  readonly params: Record<string, unknown>
}

async function readRpc(request: AsyncIterable<Uint8Array>): Promise<RpcRequest> {
  const chunks: Uint8Array[] = []
  for await (const chunk of request) chunks.push(chunk)
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as RpcRequest
}

function sendRpcResult(response: import('node:http').ServerResponse, id: RpcRequest['id'], result: unknown): void {
  const body = JSON.stringify({ jsonrpc: '2.0', id, result })
  sendJsonBody(response, body)
}

function sendJsonResponse(response: import('node:http').ServerResponse, result: unknown): void {
  sendJsonBody(response, JSON.stringify(result))
}

function sendJsonBody(response: import('node:http').ServerResponse, body: string): void {
  response.writeHead(200, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(body),
    connection: 'close',
  })
  response.end(body)
}

function manifestDevice(document: Record<string, unknown>): {
  device_id: string
  signing_key_id: string
} {
  const manifest = document.deviceManifest as { devices?: unknown[] } | undefined
  const device = manifest?.devices?.[0] as Record<string, unknown> | undefined
  if (device === undefined) throw new Error('fixture DID document has no device manifest')
  return {
    device_id: requiredString(device.device_id),
    signing_key_id: requiredString(device.signing_key_id),
  }
}

function accessToken(
  did: string,
  userId: string,
  device: { device_id: string; signing_key_id: string },
): string {
  const now = Math.floor(Date.now() / 1_000)
  const claims = {
    iss: 'user-service',
    aud: ['awiki-user-service', 'awiki-message-service'],
    sub: did,
    type: 'access',
    purpose: 'awiki.device.access.v1',
    did,
    user_id: userId,
    device_id: device.device_id,
    key_id: device.signing_key_id,
    auth_generation: 1,
    scopes: ['device:manage', 'device:read', 'message:connect'],
    iat: now,
    nbf: now,
    exp: now + 3_600,
    jti: `phase4-${device.device_id}`,
  }
  return `e30.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.fixture`
}

function requiredString(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error('fixture string is absent')
  return value
}

function documentHash(document: Record<string, unknown>): string {
  return `sha256:${createHash('sha256').update(canonicalJson(document)).digest('base64url')}`
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(',')}}`
  }
  const encoded = JSON.stringify(value)
  if (encoded === undefined) throw new Error('fixture value is not JSON')
  return encoded
}

async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('fixture server has no TCP address')
  return `http://127.0.0.1:${address.port}`
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close(error => error === undefined ? resolve() : reject(error))
  })
}
