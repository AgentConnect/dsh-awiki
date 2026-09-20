import { afterEach, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { setup } from './harness.ts'
import { WEB_METHOD_CAPABILITIES } from './method-fixtures.ts'

let context: Context | undefined
afterEach(async () => { await context?.fiber.dispose(); context = undefined })

it('returns Core creation and registration resume hints even when creation is closed', async () => {
  const h = await setup()
  context = h.ctx
  h.client.identity = null
  h.client.creationMethods = []
  h.client.pendingRegistrations = [{ did: 'did:web:identity.example:users:first', fullHandle: 'first.awiki.info', method: 'web', displayName: 'first', verificationKind: 'phone', phase: 'remote_committed' }]
  const result = await h.ctx.awiki.getIdentityAccessState()
  expect(result).toMatchObject({ ok: true, value: { creationMethods: [], pendingRegistrations: h.client.pendingRegistrations } })
  expect(h.client.registrationRequests).toEqual([])
  expect(h.client.joinMutations).toEqual([])
})

it('keeps Web method limits in the Host even on a platform supporting root transfer', async () => {
  const h = await setup()
  context = h.ctx
  h.client.methodCapabilities = WEB_METHOD_CAPABILITIES
  h.client.currentDevice = { role: 'admin', readiness: 'admin_ready', canManage: true }
  h.client.registryDevices = [{ deviceId: 'internal-member', role: 'member', status: 'active', managementReady: false, isCurrent: false }]
  const snapshot = await h.ctx.awiki.refreshDeviceManagement()
  expect(snapshot).toMatchObject({ ok: true, value: { rootTransferSupported: false, methodCapabilities: WEB_METHOD_CAPABILITIES } })
  if (!snapshot.ok) throw new Error('missing snapshot')
  const result = await h.ctx.awiki.prepareRootTransfer({ deviceRef: snapshot.value.devices[0]!.deviceRef })
  expect(result).toEqual({ ok: false, error: { code: 'forbidden', message: 'The AWiki operation is not permitted.' } })
  expect(h.client.joinMutations).not.toContain('root-prepare')
  expect(JSON.stringify(snapshot)).not.toContain('internal-member')
})

it('requires a current Web admin and the same public identity before forwarding service writes', async () => {
  const h = await setup()
  context = h.ctx
  h.client.methodCapabilities = WEB_METHOD_CAPABILITIES
  const did = h.client.identity!.did
  h.client.identityServices = { did, canManage: true, pending: false, services: [] }
  const request = { did, services: [{ id: `${did}#links`, type: 'Links', serviceEndpoint: 'https://public.example' }] }
  await expect(h.ctx.awiki.updateIdentityServices(request)).resolves.toEqual({ ok: false, error: { code: 'forbidden', message: 'The AWiki operation is not permitted.' } })
  h.client.currentDevice = { role: 'admin', readiness: 'admin_ready', canManage: true }
  await expect(h.ctx.awiki.updateIdentityServices({ ...request, did: 'did:web:other.example' })).resolves.toEqual({ ok: false, error: { code: 'conflict', message: 'The AWiki operation conflicts with current state.' } })
  expect(h.client.joinMutations).toEqual([])
  await expect(h.ctx.awiki.updateIdentityServices(request)).resolves.toMatchObject({ ok: true, value: { services: request.services } })
  expect(h.client.joinMutations).toEqual(['services-update'])
})

it('offers pending service updates only through explicit resume and retains current authorization', async () => {
  const h = await setup()
  context = h.ctx
  h.client.methodCapabilities = WEB_METHOD_CAPABILITIES
  h.client.currentDevice = { role: 'admin', readiness: 'admin_ready', canManage: true }
  const did = h.client.identity!.did
  h.client.identityServices = { did, canManage: true, pending: true, services: [] }
  await h.ctx.awiki.getIdentityServices()
  expect(h.client.joinMutations).toEqual([])
  await expect(h.ctx.awiki.updateIdentityServices({ did, services: [] })).resolves.toEqual({ ok: false, error: { code: 'conflict', message: 'The AWiki operation conflicts with current state.' } })
  await expect(h.ctx.awiki.resumeIdentityServicesUpdate({ did: 'did:web:other.example' })).resolves.toEqual({ ok: false, error: { code: 'conflict', message: 'The AWiki operation conflicts with current state.' } })
  await expect(h.ctx.awiki.resumeIdentityServicesUpdate({ did })).resolves.toMatchObject({ ok: true })
  expect(h.client.joinMutations).toEqual(['services-resume'])
  h.client.currentDevice = { role: 'member', readiness: 'member_ready', canManage: false }
  await expect(h.ctx.awiki.resumeIdentityServicesUpdate({ did })).resolves.toEqual({ ok: false, error: { code: 'forbidden', message: 'The AWiki operation is not permitted.' } })
  expect(h.client.joinMutations).toEqual(['services-resume'])
})
