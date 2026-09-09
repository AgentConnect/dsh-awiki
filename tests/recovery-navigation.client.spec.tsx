// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import type { AwikiRecoveryProgress } from '../src/types.ts'
import { AwikiController } from '../src/client/controller.ts'
import { renderOverlay } from './helpers.overlay.tsx'
import { carried, fakeRemote, identity, success } from './helpers.client.ts'

const controllers: AwikiController[] = []
afterEach(() => {
  cleanup()
  for (const controller of controllers.splice(0)) controller.dispose()
  localStorage.clear()
  vi.restoreAllMocks()
})

function progress(overrides: Partial<AwikiRecoveryProgress> = {}): AwikiRecoveryProgress {
  return {
    operationId: 'recovery-alice', fullHandle: 'alice.awiki.info', currentDid: identity.did,
    phase: 'identity_transition_pending', allowedActions: [], retryable: true,
    localOrdinaryDataWillMigrate: true, otherDevicesMustRejoin: true, ...overrides,
  }
}

async function chooseHandle(handle: string) {
  fireEvent.change(await screen.findByLabelText('Handle'), { target: { value: handle } })
  fireEvent.change(screen.getByLabelText('手机号'), { target: { value: '13800000000' } })
  fireEvent.click(screen.getByRole('button', { name: '获取验证码' }))
}

it.each([
  progress({ phase: 'awaiting_factor', allowedActions: ['prepare', 'discard_pre_attempt'] }),
  progress({ phase: 'ready_to_commit', allowedActions: ['activate', 'discard_pre_attempt'] }),
  progress({ phase: 'remote_outcome_unknown' }),
  progress({ phase: 'remote_committed' }),
  progress(),
  progress({ phase: 'quarantined_key_unavailable' }),
  progress({ failureCode: 'local_transition_superseded' }),
])('returns from $phase without cancelling or deleting and can reenter the exact Handle', async state => {
  const b = renderOverlay({ registered: false, recoveryProgress: state })
  controllers.push(b.controller)
  fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
  await chooseHandle('alice')
  const back = await screen.findByRole('button', { name: '返回身份入口' })
  expect(b.controller.getSnapshot().recoveryOperationId).toBe(state.operationId)
  fireEvent.click(back)
  await screen.findByLabelText('Handle')
  fireEvent.click(screen.getByRole('button', { name: '关闭 AWiki' }))
  fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
  await screen.findByLabelText('Handle')
  expect(b.controller.getSnapshot().recoveryOperationId).toBeNull()
  await chooseHandle('alice')
  await screen.findByRole('button', { name: '返回身份入口' })
  expect(b.controller.getSnapshot().recoveryOperationId).toBe(state.operationId)
  expect(b.fake.calls.filter(c => ['sendRegistrationOtp', 'sendRecoveryOtp', 'discardRecovery', 'clearLocalData'].includes(c.method))).toEqual([])
})

it('can leave a failed status read and obtain a verification code for another Handle', async () => {
  const b = renderOverlay({ registered: false, recoveryProgress: progress() })
  controllers.push(b.controller)
  b.fake.remote.getRecoveryStatus = () => carried({ ok: false, error: { code: 'network', message: 'unavailable' } })
  fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
  await chooseHandle('alice')
  fireEvent.click(await screen.findByRole('button', { name: '返回身份入口' }))
  await chooseHandle('bob')
  await screen.findByLabelText('注册验证码')
  expect(b.controller.getSnapshot().recoveryOperationId).toBeNull()
  expect(b.fake.calls.filter(c => c.method === 'sendRegistrationOtp')).toEqual([
    { method: 'sendRegistrationOtp', request: { handle: 'bob', phone: '13800000000' } },
  ])
  expect(b.fake.calls.filter(c => ['discardRecovery', 'clearLocalData'].includes(c.method))).toEqual([])
})

it.each(['activateRecovery', 'resumeRecovery'] as const)('ignores late %s completion after return without unlocking another request or entering the old identity', async method => {
  const state = progress({ phase: method === 'activateRecovery' ? 'ready_to_commit' : 'identity_transition_pending',
    allowedActions: [method === 'activateRecovery' ? 'activate' : 'resume'] })
  const fake = fakeRemote({ identity: null, recoveryProgress: state })
  const controller = new AwikiController(fake.remote)
  controllers.push(controller)
  await controller.loadSession()
  await controller.continueRecoveryForHandle('alice')
  let finish!: () => void
  fake.remote[method] = () => new Promise(resolve => {
    finish = () => resolve({ ok: true, value: success(progress({ phase: 'applied', allowedActions: ['activate_identity'] })) })
  })
  const old = controller[method]()
  controller.leaveRecovery()
  let finishNew!: () => void
  fake.remote.sendRegistrationOtp = () => new Promise(resolve => {
    finishNew = () => resolve({ ok: true, value: success({ retryAfterSeconds: 60 }) })
  })
  const next = controller.sendRegistrationOtp({ handle: 'bob', phone: '13800000000' })
  finish()
  expect((await old).ok).toBe(false)
  expect(controller.getSnapshot()).toMatchObject({
    recoveryOperationId: null, recoveryProgress: null, identity: null, pending: '发送验证码', error: null,
  })
  expect(fake.calls.filter(c => c.method === 'enterRecoveredSession')).toEqual([])
  finishNew()
  expect((await next).ok).toBe(true)
})

it('does not allow a late recovery error to reappear on the new account form', async () => {
  const b = renderOverlay({ registered: false, recoveryProgress: progress({ phase: 'ready_to_commit', allowedActions: ['activate'] }) })
  controllers.push(b.controller)
  let finish!: () => void
  b.fake.remote.activateRecovery = () => new Promise(resolve => {
    finish = () => resolve({ ok: true, value: { ok: false, error: { code: 'remote', message: 'late failure' } } })
  })
  fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
  await chooseHandle('alice')
  fireEvent.click(await screen.findByRole('button', { name: '确认并恢复身份' }))
  fireEvent.click(screen.getByRole('button', { name: '返回身份入口' }))
  await chooseHandle('bob')
  await screen.findByLabelText('注册验证码')
  await act(async () => { finish() })
  expect(screen.queryByRole('alert')).toBeNull()
  expect(screen.getByLabelText('Handle')).toHaveProperty('value', 'bob')
})

it('keeps applied status reads separate from explicitly entering the recovered session', async () => {
  const fake = fakeRemote({ identity: null, recoveryProgress: progress() })
  const controller = new AwikiController(fake.remote)
  controllers.push(controller)
  await controller.loadSession()
  await controller.continueRecoveryForHandle('alice')
  fake.remote.getRecoveryStatus = () => carried(success(progress({ phase: 'applied', allowedActions: ['activate_identity'] })))
  await controller.refreshRecoveryStatus()
  expect(controller.getSnapshot().identity).toBeNull()
  expect(fake.calls.filter(c => c.method === 'enterRecoveredSession')).toEqual([])
  expect((await controller.enterRecoveredSession()).ok).toBe(true)
  expect(fake.calls.filter(c => c.method === 'enterRecoveredSession')).toHaveLength(1)
  expect(controller.getSnapshot().identity).toEqual(identity)
})

it('an unrelated unfinished recovery never replaces an active account with the identity entry', async () => {
  const b = renderOverlay({ recoveryProgress: progress() })
  controllers.push(b.controller)
  fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
  await waitFor(() => { expect(screen.getByRole('button', { name: 'AWiki 账户菜单' })).toBeTruthy() })
  expect(screen.queryByLabelText('Handle')).toBeNull()
  expect(b.fake.calls.filter(c => c.method === 'getRecoveryStatus')).toEqual([])
})
