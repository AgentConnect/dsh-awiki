// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AwikiIdentityAccess } from '../src/client/AwikiIdentityAccess.tsx'
import { AwikiIdentityServices } from '../src/client/AwikiIdentityServices.tsx'
import { AwikiDevices } from '../src/client/AwikiDevices.tsx'
import type { AwikiIdentityAccessState, AwikiIdentityServicesSnapshot, AwikiUpdateIdentityServicesRequest } from '../src/types.ts'
import type { AwikiController } from '../src/client/controller.ts'
import { renderOverlay } from './helpers.overlay.tsx'
import { WBA_METHOD_CAPABILITIES, WEB_METHOD_CAPABILITIES } from './method-fixtures.ts'

const controllers: AwikiController[] = []
afterEach(() => { cleanup(); for (const controller of controllers.splice(0)) controller.dispose() })
const did = 'did:web:identity.example:users:web-first'
const access: AwikiIdentityAccessState = { choice: null, joining: false, recoveries: [], creationMethods: ['wba', 'web'], pendingRegistrations: [] }

async function identityPage(state = access) {
  const b = renderOverlay({ registered: false })
  controllers.push(b.controller)
  await act(async () => { await b.controller.open() })
  cleanup()
  const mount = () => render(<AwikiIdentityAccess {...b.props} access={state} sessionStatus="unregistered" recoveryOperationId={null} recoveryProgress={null} pending={false} />)
  return { ...b, mount, first: mount() }
}

it('keeps WBA as the default and passes an explicit Web choice through OTP and registration', async () => {
  const b = await identityPage()
  expect(await screen.findByLabelText('身份方法')).toHaveProperty('value', 'wba')
  fireEvent.change(screen.getByLabelText('身份方法'), { target: { value: 'web' } })
  expect(screen.getByText(/首个管理员丢失后无法恢复管理能力/u)).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Handle'), { target: { value: 'web-first' } })
  fireEvent.change(screen.getByLabelText('手机号'), { target: { value: '+15555550123' } })
  fireEvent.click(screen.getByRole('button', { name: '获取验证码' }))
  fireEvent.change(await screen.findByLabelText('注册验证码'), { target: { value: '123456' } })
  fireEvent.click(screen.getByRole('button', { name: '继续', exact: true }))
  await waitFor(() => { expect(b.fake.calls.filter(value => value.method === 'registerIdentity')).toHaveLength(1) })
  expect(b.fake.calls.find(value => value.method === 'sendRegistrationOtp')?.request).toMatchObject({ didMethod: 'web' })
  expect(b.fake.calls.find(value => value.method === 'registerIdentity')?.request).toMatchObject({ didMethod: 'web' })
})

it('rediscovers pending Web registration after reopening even when new creation is closed, without registering automatically', async () => {
  const pending = { did, fullHandle: 'web-first.awiki.example', method: 'web' as const, displayName: 'web-first', verificationKind: 'phone', phase: 'remote_committed' as const }
  const b = await identityPage({ ...access, creationMethods: [], pendingRegistrations: [pending] })
  fireEvent.click(await screen.findByRole('button', { name: `继续注册 ${pending.fullHandle}` }))
  expect(screen.getByLabelText('Handle')).toHaveProperty('value', pending.fullHandle)
  expect(b.fake.calls.filter(value => value.method === 'registerIdentity')).toHaveLength(0)
  b.first.unmount()
  b.mount()
  fireEvent.click(await screen.findByRole('button', { name: `继续注册 ${pending.fullHandle}` }))
  fireEvent.change(screen.getByLabelText('手机号'), { target: { value: '+15555550123' } })
  fireEvent.click(screen.getByRole('button', { name: '获取验证码' }))
  await screen.findByLabelText('注册验证码')
  expect(b.fake.calls.filter(value => value.method === 'registerIdentity')).toHaveLength(0)
  expect(b.fake.calls.find(value => value.method === 'sendRegistrationOtp')?.request).toMatchObject({ didMethod: 'web', handle: pending.fullHandle })
})

it.each([WEB_METHOD_CAPABILITIES, WBA_METHOD_CAPABILITIES])('uses the existing Handle method for recovery actions: $method', async capabilities => {
  await identityPage({ ...access, choice: { status: 'join-required', fullHandle: 'known.awiki.example' as never, mode: 'ordinary', requiresUserPresence: false, methodCapabilities: capabilities } })
  expect(await screen.findByRole('button', { name: '加入新设备（推荐）' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: '恢复 Handle（会替换 DID）' }) !== null).toBe(capabilities.handleRecovery)
})

function servicesFixture() {
  const protectedService = { id: `${did}#handle`, type: 'ANPHandleService', serviceEndpoint: 'https://provider.example', profiles: ['protected-profile'] }
  let snapshot: AwikiIdentityServicesSnapshot = { did, canManage: true, pending: false, services: [protectedService] }
  const getIdentityServices = vi.fn(async () => ({ ok: true as const, value: snapshot }))
  const updateIdentityServices = vi.fn(async (request: AwikiUpdateIdentityServicesRequest) => {
    snapshot = { ...snapshot, pending: true, services: request.services }
    return { ok: false as const, error: '连接中断，请重新检查。' }
  })
  const resumeIdentityServicesUpdate = vi.fn(async () => {
    snapshot = { ...snapshot, pending: false }
    return { ok: true as const, value: snapshot }
  })
  return { protectedService, getIdentityServices, updateIdentityServices, resumeIdentityServicesUpdate }
}

it('does not expose Recovery for a Web identity even when the session needs credential repair', async () => {
  const b = await identityPage()
  b.first.unmount()
  render(<AwikiIdentityAccess {...b.props} access={{ ...access, methodCapabilities: WEB_METHOD_CAPABILITIES }} sessionStatus="recovery-required" recoveryOperationId={null} recoveryProgress={null} pending={false} />)
  expect(await screen.findByText(/此身份不支持恢复/u)).toBeTruthy()
  expect(screen.queryByRole('button', { name: /发送.*验证码|恢复身份/u })).toBeNull()
  expect(b.fake.calls.filter(value => value.method === 'sendRecoveryOtp')).toHaveLength(0)
})

it('preserves protected services and resumes one committed update after response loss and a fresh page', async () => {
  const fixture = servicesFixture()
  const first = render(<AwikiIdentityServices {...fixture} />)
  expect(await screen.findByText('系统服务，只读')).toBeTruthy()
  expect(screen.queryByRole('button', { name: '删除服务' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '添加服务' }))
  fireEvent.change(screen.getByLabelText('服务标识'), { target: { value: `${did}#links` } })
  fireEvent.change(screen.getByLabelText('服务类型'), { target: { value: 'Links' } })
  fireEvent.change(screen.getByLabelText('服务地址'), { target: { value: 'https://public.example/links' } })
  fireEvent.click(screen.getByRole('button', { name: '保存服务' }))
  await screen.findByText('服务更新尚未确认')
  expect(fixture.updateIdentityServices).toHaveBeenCalledTimes(1)
  expect(fixture.updateIdentityServices.mock.calls[0]?.[0]).toEqual({ did, services: [fixture.protectedService, { id: `${did}#links`, type: 'Links', serviceEndpoint: 'https://public.example/links' }] })
  expect(screen.queryByRole('button', { name: '添加服务' })).toBeNull()
  first.unmount()
  render(<AwikiIdentityServices {...fixture} />)
  await screen.findByText('服务更新尚未确认')
  expect(fixture.resumeIdentityServicesUpdate).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '继续原服务更新' }))
  await screen.findByRole('button', { name: '添加服务' })
  expect(fixture.resumeIdentityServicesUpdate).toHaveBeenCalledTimes(1)
  expect(fixture.updateIdentityServices).toHaveBeenCalledTimes(1)
})

it('closes service writes when reconciliation cannot read the durable pending state', async () => {
  const fixture = servicesFixture()
  const read = vi.fn().mockResolvedValueOnce({ ok: true, value: { did, canManage: true, pending: false, services: [] } })
    .mockResolvedValue({ ok: false, error: '暂时无法读取服务状态。' })
  render(<AwikiIdentityServices {...fixture} getIdentityServices={read} />)
  fireEvent.click(await screen.findByRole('button', { name: '重新检查服务' }))
  await screen.findByText('暂时无法读取服务状态。')
  expect(screen.queryByRole('button', { name: '添加服务' })).toBeNull()
  expect(screen.queryByRole('button', { name: '继续原服务更新' })).toBeNull()
})

it.each([false, true])('uses Web and current device permission together in the devices UI: admin=$0', async canManage => {
  const b = renderOverlay()
  controllers.push(b.controller)
  cleanup()
  const fixture = servicesFixture()
  render(<AwikiDevices {...b.props} {...fixture} active pending={false} refreshDeviceManagement={async () => ({ ok: true, value: {
    canManage, rootTransferSupported: false, methodCapabilities: WEB_METHOD_CAPABILITIES,
    role: canManage ? 'admin' : 'member', readiness: canManage ? 'admin_ready' : 'member_ready', requests: [],
    devices: [{ deviceRef: 'member-ref', displayId: 'safe-member', status: 'active', role: 'member', managementReady: false, isCurrent: false }],
  } })} />)
  await waitFor(() => { expect(screen.queryByText('正在读取设备状态…')).toBeNull() })
  expect(screen.queryByRole('button', { name: '授予管理权' })).toBeNull()
  expect(screen.queryByRole('button', { name: '撤销', exact: true }) !== null).toBe(canManage)
  if (canManage) expect(await screen.findByRole('button', { name: '添加服务' })).toBeTruthy()
  else { expect(screen.queryByRole('button', { name: '添加服务' })).toBeNull(); expect(fixture.getIdentityServices).not.toHaveBeenCalled() }
})
