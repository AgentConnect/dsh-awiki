// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderOverlay } from './helpers.overlay.tsx'
import { carried, success, identity, fakeRemote } from './helpers.client.ts'
import { AwikiController, type AwikiRemote } from '../src/client/controller.ts'

const controllers: AwikiController[] = []
afterEach(() => {
  cleanup()
  for (const controller of controllers.splice(0)) controller.dispose()
  localStorage.clear()
  sessionStorage.clear()
  vi.restoreAllMocks()
})

function setup(options: Parameters<typeof renderOverlay>[0] = {}) {
  const result = renderOverlay(options)
  controllers.push(result.controller)
  return result
}

async function enter() {
  fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
  fireEvent.change(await screen.findByLabelText('Handle'), { target: { value: 'alice' } })
  fireEvent.change(screen.getByLabelText('手机号'), { target: { value: '13800000000' } })
  fireEvent.click(screen.getByRole('button', { name: '获取验证码' }))
  fireEvent.change(await screen.findByLabelText('注册验证码'), { target: { value: '123456' } })
}

async function choice() {
  const result = setup({ registered: false,
    config: { pollIntervalMs: 60000, attachmentMaxBytes: 1024, handleRecoveryPhoneEnabled: true },
    registrationOutcome: { status: 'join-required', fullHandle: 'alice.awiki.info' as never, mode: 'ordinary', requiresUserPresence: false },
  })
  await enter()
  fireEvent.click(screen.getByRole('button', { name: '继续' }))
  await screen.findByRole('button', { name: '加入新设备（推荐）' })
  return result
}

async function refresh(result: ReturnType<typeof setup>) {
  const config = result.fake.remote.getConfig
  let completed = false
  result.fake.remote.getConfig = async () => {
    await new Promise(resolve => setTimeout(resolve, 10))
    completed = true
    return config()
  }
  fireEvent.click(screen.getByRole('button', { name: '刷新 AWiki' }))
  await waitFor(() => { expect(completed).toBe(true); expect(result.controller.getSnapshot().accessLoading).toBe(false) })
}

function reopen() {
  fireEvent.click(screen.getByRole('button', { name: '关闭 AWiki' }))
  fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
}

describe('AWiki workflow continuity', () => {
  it.each([false, true])('keeps Recovery visible across reopen when capability is false (online=%s), then retries safely', async (online) => {
    const b = setup({ registered: false,
      config: { pollIntervalMs: 60000, attachmentMaxBytes: 1024, handleRecoveryPhoneEnabled: false, tenantOnline: online },
      registrationOutcome: { status: 'join-required', fullHandle: 'alice.awiki.info' as never, mode: 'ordinary', requiresUserPresence: false },
    })
    await enter()
    fireEvent.click(screen.getByRole('button', { name: '继续' }))
    expect(await screen.findByRole('button', { name: '恢复 Handle（会替换 DID）' })).toBeTruthy()
    reopen()
    fireEvent.click(await screen.findByRole('button', { name: '恢复 Handle（会替换 DID）' }))
    expect(await screen.findByRole('heading', { name: '确认替换此 Handle 的 DID' })).toBeTruthy()
    expect(b.fake.calls.filter(call => call.method === 'sendRecoveryOtp')).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: '发送恢复验证码并替换 DID' }))
    expect(await screen.findByText(online
      ? '当前服务器未启用手机号恢复，请加入新设备或联系管理员。'
      : '暂时无法确认服务器的恢复能力，请稍后重试。')).toBeTruthy()
    expect(b.fake.calls.filter(call => call.method === 'cancelDeviceJoin')).toHaveLength(0)
    expect(b.fake.calls.filter(call => call.method === 'sendRecoveryOtp')).toHaveLength(0)
    b.fake.remote.getConfig = () => carried(success({
      pollIntervalMs: 60000, attachmentMaxBytes: 1024, handleRecoveryPhoneEnabled: true, tenantOnline: true,
    }))
    fireEvent.click(screen.getByRole('button', { name: '恢复 Handle（会替换 DID）' }))
    fireEvent.click(await screen.findByRole('button', { name: '发送恢复验证码并替换 DID' }))
    expect(await screen.findByRole('heading', { name: '验证身份归属' })).toBeTruthy()
    expect(b.fake.calls.filter(call => call.method === 'cancelDeviceJoin')).toHaveLength(1)
    expect(b.fake.calls.filter(call => call.method === 'sendRecoveryOtp')).toHaveLength(1)
  })

  it('keeps entered OTP, fields, and the resend deadline on refresh and panel reopen', async () => {
    const b = setup({ registered: false })
    await enter()
    await refresh(b)
    expect(screen.getByLabelText('注册验证码')).toHaveProperty('value', '123456')
    reopen()
    expect(await screen.findByLabelText('Handle')).toHaveProperty('value', 'alice')
    expect(screen.getByLabelText('手机号')).toHaveProperty('value', '13800000000')
    expect(screen.getByRole('button', { name: /秒后重新获取/ })).toHaveProperty('disabled', true)
    expect(b.fake.calls.filter(call => call.method === 'sendRegistrationOtp')).toHaveLength(1)
    expect(JSON.stringify(b.controller.getSnapshot())).not.toMatch(/13800000000|123456/)
    expect(JSON.stringify(localStorage)).not.toMatch(/13800000000|123456/)
  })

  it('keeps the existing-account choice without consuming verification again', async () => {
    const b = await choice()
    await refresh(b)
    expect(screen.getByRole('button', { name: '加入新设备（推荐）' })).toBeTruthy()
    reopen()
    expect(await screen.findByRole('button', { name: '恢复 Handle（会替换 DID）' })).toBeTruthy()
    expect(b.fake.calls.filter(call => call.method === 'registerIdentity')).toHaveLength(1)
  })

  it('rechecks Host capability before cancelling Join after the first Recovery warning', async () => {
    const b = await choice()
    fireEvent.click(screen.getByRole('button', { name: '恢复 Handle（会替换 DID）' }))
    expect(await screen.findByRole('heading', { name: '确认替换此 Handle 的 DID' })).toBeTruthy()
    let capabilityReads = 0
    b.fake.remote.getConfig = () => {
      capabilityReads += 1
      return carried(success({
      pollIntervalMs: 60_000,
      attachmentMaxBytes: 1_024,
      handleRecoveryPhoneEnabled: false,
      }))
    }

    fireEvent.click(screen.getByRole('button', { name: '发送恢复验证码并替换 DID' }))

    await waitFor(() => { expect(capabilityReads).toBe(1) })
    expect(await screen.findByRole('button', { name: '加入新设备（推荐）' })).toBeTruthy()
    expect(b.controller.getSnapshot().handleRecoveryPhoneEnabled).toBe(false)
    expect(b.fake.calls.filter(call => call.method === 'cancelDeviceJoin')).toHaveLength(0)
    expect(b.fake.calls.filter(call => call.method === 'sendRecoveryOtp')).toHaveLength(0)
  })

  it('does not send a Join-origin Recovery OTP after cancel crosses tenant, generation, flow, and capability', async () => {
    const b = await choice()
    let tenant = 'origin-tenant'
    b.fake.remote.getConfig = () => carried(success({
      tenantId: tenant,
      pollIntervalMs: 60_000,
      attachmentMaxBytes: 1_024,
      handleRecoveryPhoneEnabled: tenant === 'origin-tenant',
    }))
    await refresh(b)
    let finishCancel!: () => void
    b.fake.remote.cancelDeviceJoin = () => {
      b.fake.calls.push({ method: 'cancelDeviceJoin' })
      return new Promise(resolve => {
        finishCancel = () => resolve(carried(success({ completed: true as const })))
      })
    }

    fireEvent.click(screen.getByRole('button', { name: '恢复 Handle（会替换 DID）' }))
    fireEvent.click(await screen.findByRole('button', { name: '发送恢复验证码并替换 DID' }))
    await waitFor(() => { expect(b.fake.calls.filter(call => call.method === 'cancelDeviceJoin')).toHaveLength(1) })
    b.controller.close()
    tenant = 'target-tenant'
    await b.controller.open()
    expect(b.controller.getSnapshot().handleRecoveryPhoneEnabled).toBe(false)

    finishCancel()

    await waitFor(() => { expect(b.controller.getSnapshot().pending).toBeNull() })
    expect(b.fake.calls.filter(call => call.method === 'sendRecoveryOtp')).toHaveLength(0)
    expect(localStorage.getItem('awiki.handle-recovery.operation.v1.target-tenant')).toBeNull()
  })

  it('discovers the Host choice on a fresh browser without storing a continuation', async () => {
    const b = setup({ registered: false, config: { pollIntervalMs: 60000, attachmentMaxBytes: 1024, handleRecoveryPhoneEnabled: true } })
    b.fake.remote.getIdentityAccessState = () => carried(success({ joining: false, recoveries: [], choice: {
      status: 'join-required', fullHandle: 'alice.awiki.info' as never, mode: 'ordinary', requiresUserPresence: false,
    } }))
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('button', { name: '恢复 Handle（会替换 DID）' }))
    expect(await screen.findByRole('heading', { name: '确认替换此 Handle 的 DID' })).toBeTruthy()
    expect(b.fake.calls.some(call => call.method === 'cancelDeviceJoin')).toBe(false)
    expect(b.fake.calls.some(call => call.method === 'sendRecoveryOtp')).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: '发送恢复验证码并替换 DID' }))
    expect(await screen.findByLabelText('绑定手机号')).toHaveProperty('value', '')
    expect(screen.getByText('alice.awiki.info')).toBeTruthy()
    expect(b.fake.calls.filter(call => call.method === 'cancelDeviceJoin')).toHaveLength(1)
    expect(b.fake.calls.some(call => call.method === 'sendRecoveryOtp')).toBe(false)
    expect(JSON.stringify(b.controller.getSnapshot())).not.toMatch(/continuationId|joinSessionId/)
  })

  it('blocks new login while discovery is delayed or failed, then retries in place', async () => {
    const b = setup({ registered: false })
    let finish!: () => void
    b.fake.remote.getIdentityAccessState = () => new Promise(resolve => {
      finish = () => resolve({ ok: true, value: { ok: false, error: { code: 'network', message: 'unavailable' } } })
    })
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    await screen.findByText('正在确认本机身份操作…')
    expect(screen.queryByLabelText('Handle')).toBeNull()
    finish()
    await screen.findByRole('button', { name: '重新检查身份状态' })
    expect(screen.queryByLabelText('Handle')).toBeNull()
    b.fake.remote.getIdentityAccessState = () => carried(success({ choice: null, joining: false, recoveries: [] }))
    fireEvent.click(screen.getByRole('button', { name: '重新检查身份状态' }))
    expect(await screen.findByLabelText('Handle')).toBeTruthy()
  })

  it('keeps a started Join resumable when its status read fails', async () => {
    const b = setup({ registered: false })
    b.fake.remote.getIdentityAccessState = () => carried(success({ choice: null, joining: true, recoveries: [] }))
    b.fake.remote.getDeviceJoinStatus = () => carried({ ok: false, error: { code: 'network', message: 'offline' } })
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    await screen.findByRole('button', { name: '重新检查加入状态' })
    expect(screen.queryByLabelText('Handle')).toBeNull()
    b.fake.remote.getDeviceJoinStatus = () => carried(success({ phase: 'pending', completed: false, expiresAt: '2099-01-01T00:00:00Z' }))
    fireEvent.click(screen.getByRole('button', { name: '重新检查加入状态' }))
    expect(await screen.findByRole('heading', { name: '正在加入设备' })).toBeTruthy()
    expect(b.fake.calls.some(call => call.method === 'beginDeviceJoin')).toBe(false)
  })

  it('discovers pending recovery with empty browser storage and no published identity', async () => {
    const b = setup({ registered: false, recoveryProgress: {
      operationId: 'durable-recovery', fullHandle: 'alice.awiki.info', currentDid: identity.did,
      phase: 'awaiting_factor', allowedActions: ['request_otp', 'prepare', 'discard_pre_attempt'] as const, retryable: false, localOrdinaryDataWillMigrate: false, otherDevicesMustRejoin: true,
    } })
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.change(await screen.findByLabelText('Handle'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByLabelText('手机号'), { target: { value: '13800000000' } })
    fireEvent.click(screen.getByRole('button', { name: '获取验证码' }))
    expect(await screen.findByRole('heading', { name: '验证身份归属' })).toBeTruthy()
    expect(b.controller.getSnapshot().recoveryOperationId).toBe('durable-recovery')
    expect(screen.getByRole('button', { name: '重新获取恢复验证码' })).toHaveProperty('disabled', true)
    fireEvent.change(screen.getByLabelText('绑定手机号'), { target: { value: '13800000000' } })
    expect(screen.getByRole('button', { name: '重新获取恢复验证码' })).toHaveProperty('disabled', false)
    expect(b.fake.calls.some(call => call.method === 'sendRecoveryOtp')).toBe(false)
  })

  it.each(['active', 'unregistered', 'recovery-required'] as const)(
    'prioritizes a stored Recovery operation over identity-access failure for %s sessions',
    async sessionStatus => {
      const b = setup({
        sessionStatus,
        identity: sessionStatus === 'unregistered' ? null : identity,
        recoveryProgress: {
          operationId: 'stored-operation', fullHandle: 'alice.awiki.info', currentDid: identity.did,
          phase: 'awaiting_factor', allowedActions: ['request_otp', 'prepare', 'discard_pre_attempt'],
          retryable: false, localOrdinaryDataWillMigrate: false, otherDevicesMustRejoin: true,
        },
      })
      await b.controller.open()
      await expect(b.controller.selectRecovery('stored-operation')).resolves.toMatchObject({ ok: true })
      b.fake.remote.getIdentityAccessState = () => carried({
        ok: false,
        error: { code: 'network', message: 'private discovery sentinel' },
      })
      await expect(b.controller.refreshIdentityAccess()).resolves.toMatchObject({ ok: false })

      fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))

      expect(await screen.findByRole('button', { name: '重新检查恢复结果' })).toBeTruthy()
      expect(screen.queryByRole('button', { name: '重新检查身份状态' })).toBeNull()
      expect(screen.queryByLabelText('Handle')).toBeNull()
      expect(document.body.textContent).not.toContain('private discovery sentinel')
      expect(b.controller.getSnapshot().recoveryOperationId).toBe('stored-operation')
    },
  )

  it.each([
    ['business', 'private Recovery business detail'],
    ['carrier', 'private Recovery carrier detail'],
    ['throw', 'private Recovery thrown detail'],
  ] as const)('projects a %s Recovery refresh failure before rendering it', async (failureKind, privateDetail) => {
    const b = setup({ registered: false, recoveryProgress: {
      operationId: 'remote-committed', fullHandle: 'alice.awiki.info', currentDid: identity.did,
      phase: 'remote_committed', allowedActions: ['resume'], retryable: true,
      localOrdinaryDataWillMigrate: false, otherDevicesMustRejoin: true,
    } })
    await b.controller.open()
    await expect(b.controller.selectRecovery('remote-committed')).resolves.toMatchObject({ ok: true })
    let statusCalls = 0
    b.fake.remote.getRecoveryStatus = () => {
      statusCalls += 1
      if (statusCalls === 1) {
        return carried({ ok: false, error: { code: 'network', message: 'private initial Recovery status detail' } })
      }
      if (failureKind === 'business') {
        return carried({ ok: false, error: { code: 'remote', message: privateDetail } })
      }
      if (failureKind === 'carrier') {
        return Promise.resolve({ ok: false, error: { code: 'offline', message: privateDetail, details: {} } })
      }
      return Promise.reject(new Error(privateDetail))
    }
    await expect(b.controller.refreshIdentityAccess()).resolves.toMatchObject({ ok: false })
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    const refresh = await screen.findByRole('button', { name: '重新检查恢复结果' })
    expect(screen.getByRole('alert').textContent).toBe('暂时无法读取本机身份状态，请稍后重新检查。')
    expect(document.body.textContent).not.toContain('private initial Recovery status detail')
    expect(screen.queryByLabelText('恢复验证码')).toBeNull()
    expect(screen.queryByRole('button', { name: '取消恢复' })).toBeNull()
    expect(b.fake.calls.some(call => call.method === 'activateRecovery')).toBe(false)

    fireEvent.click(refresh)

    await waitFor(() => { expect(statusCalls).toBe(2) })
    expect(screen.getByRole('alert').textContent).toBe('暂时无法读取本机身份状态，请稍后重新检查。')
    expect(document.body.textContent).not.toContain(privateDetail)
  })

  it('requires an explicit selection when more than one recovery exists', async () => {
    const b = setup({ registered: false })
    b.fake.remote.getIdentityAccessState = () => carried(success({ choice: null, joining: false, recoveries: [
      { operationId: 'op-a', fullHandle: 'alice.awiki.info' }, { operationId: 'op-b', fullHandle: 'bob.awiki.info' },
    ] }))
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    await screen.findByLabelText('Handle')
    expect(b.fake.calls.some(call => call.method === 'getRecoveryStatus')).toBe(false)
    fireEvent.change(screen.getByLabelText('Handle'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByLabelText('手机号'), { target: { value: '13800000000' } })
    fireEvent.click(screen.getByRole('button', { name: '获取验证码' }))
    expect(await screen.findByRole('heading', { name: '验证身份归属' })).toBeTruthy()
    expect(b.fake.calls.find(call => call.method === 'getRecoveryStatus')?.request).toEqual({ operationId: 'op-a' })
  })

  it('preserves recovery factor input and resend through refresh', async () => {
    const b = await choice()
    fireEvent.click(screen.getByRole('button', { name: '恢复 Handle（会替换 DID）' }))
    expect(b.fake.calls.filter(call => call.method === 'sendRecoveryOtp')).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: '发送恢复验证码并替换 DID' }))
    fireEvent.change(await screen.findByLabelText('恢复验证码'), { target: { value: '123456' } })
    await refresh(b)
    expect(screen.getByLabelText('恢复验证码')).toHaveProperty('value', '123456')
    expect(screen.getByRole('button', { name: /秒后重新获取恢复验证码/ })).toHaveProperty('disabled', true)
    expect(b.fake.calls.filter(call => call.method === 'sendRecoveryOtp')).toHaveLength(1)
  })

  it('preserves chat selection, unsent text and attachment on refresh and close', async () => {
    const b = setup()
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('button', { name: /Bob/ }))
    fireEvent.change(screen.getByPlaceholderText('输入消息'), { target: { value: 'unsent draft' } })
    fireEvent.change(screen.getByLabelText('选择一个附件'), { target: { files: [new File(['a'], 'draft.txt')] } })
    await refresh(b)
    expect(screen.getByPlaceholderText('输入消息')).toHaveProperty('value', 'unsent draft')
    reopen()
    expect(await screen.findByPlaceholderText('输入消息')).toHaveProperty('value', 'unsent draft')
    expect(screen.getByText('draft.txt')).toBeTruthy()
    expect(b.fake.calls.some(call => call.method === 'sendText' || call.method === 'sendAttachment')).toBe(false)
  })

  it('preserves a mail draft through list refresh and panel close', async () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    await screen.findByText('Alice')
    fireEvent.click(screen.getByRole('tab', { name: /^邮件/ }))
    await screen.findByText('Release status')
    const compose = () => fireEvent.click(within(screen.getByRole('complementary', { name: '邮箱导航' })).getByRole('button', { name: '写邮件' }))
    compose()
    fireEvent.change(screen.getByLabelText('正文'), { target: { value: 'unfinished mail' } })
    fireEvent.click(screen.getByRole('button', { name: '刷新收件箱' }))
    expect(screen.getByLabelText('正文')).toHaveProperty('value', 'unfinished mail')
    reopen()
    fireEvent.click(await screen.findByRole('tab', { name: /^邮件/ }))
    compose()
    expect(screen.getByLabelText('正文')).toHaveProperty('value', 'unfinished mail')
  })
  it('keeps a profile draft through close and discards it only on explicit cancel', async () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('button', { name: '编辑个人资料' }))
    fireEvent.change(screen.getByLabelText('昵称'), { target: { value: 'Unsubmitted name' } })
    reopen()
    expect(await screen.findByLabelText('昵称')).toHaveProperty('value', 'Unsubmitted name')
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    fireEvent.click(screen.getByRole('button', { name: '编辑个人资料' }))
    expect(screen.getByLabelText('昵称')).toHaveProperty('value', 'Alice')
  })

  it('rediscovers the same operation after an OTP response is lost', async () => {
    const b = await choice()
    const send = b.fake.remote.sendRecoveryOtp
    b.fake.remote.sendRecoveryOtp = async request => {
      await send(request)
      return { ok: false, error: { code: 'network', message: 'response lost' } } as never
    }
    fireEvent.click(screen.getByRole('button', { name: '恢复 Handle（会替换 DID）' }))
    expect(b.fake.calls.filter(call => call.method === 'sendRecoveryOtp')).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: '发送恢复验证码并替换 DID' }))
    expect(await screen.findByLabelText('恢复验证码')).toBeTruthy()
    expect(b.controller.getSnapshot().recoveryOperationId).toBe('recovery-1')
    expect(b.fake.calls.filter(call => call.method === 'sendRecoveryOtp')).toHaveLength(1)
    expect(b.fake.calls.some(call => call.method === 'activateRecovery')).toBe(false)
  })

  it('retains a successful deferred Recovery OTP across close and reopen before discovery observes it', async () => {
    const b = await choice()
    const beginRecovery = vi.spyOn(b.controller, 'beginRecoveryFromDeviceJoin')
    let recoveryExists = false
    let finish!: () => void
    b.fake.remote.getIdentityAccessState = () => carried(success({
      choice: null,
      joining: false,
      recoveries: recoveryExists ? [{ operationId: 'deferred-recovery', fullHandle: 'alice.awiki.info' }] : [],
    }))
    b.fake.remote.sendRecoveryOtp = request => {
      b.fake.calls.push({ method: 'sendRecoveryOtp', request })
      return new Promise(resolve => {
        finish = () => {
          recoveryExists = true
          resolve(carried(success({
            operationId: 'deferred-recovery',
            fullHandle: request.fullHandle,
            retryAfterSeconds: 60,
            retryAt: '2099-01-01T00:01:00Z',
          })))
        }
      })
    }

    fireEvent.click(screen.getByRole('button', { name: '恢复 Handle（会替换 DID）' }))
    fireEvent.click(await screen.findByRole('button', { name: '发送恢复验证码并替换 DID' }))
    await waitFor(() => { expect(b.fake.calls.filter(call => call.method === 'sendRecoveryOtp')).toHaveLength(1) })
    const action = beginRecovery.mock.results[0]?.value
    expect(action).toBeInstanceOf(Promise)
    fireEvent.click(screen.getByRole('button', { name: '关闭 AWiki' }))
    b.controller.close()
    const reopening = b.controller.open()
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    await reopening
    expect(b.controller.getSnapshot()).toMatchObject({ accessLoading: false, recoveryOperationId: null })

    finish()

    await expect(action).resolves.toMatchObject({ ok: true, value: { operationId: 'deferred-recovery' } })

    await waitFor(() => {
      expect(b.controller.getSnapshot().recoveryOperationId).toBe('deferred-recovery')
      expect(localStorage.getItem('awiki.handle-recovery.operation.v1')).toBeNull()
    })
    expect(await screen.findByRole('heading', { name: '验证身份归属' })).toBeTruthy()
    const resend = screen.getByRole<HTMLButtonElement>('button', { name: /秒后重新获取恢复验证码/ })
    expect(resend.disabled).toBe(true)
    fireEvent.click(resend)
    expect(b.fake.calls.filter(call => call.method === 'sendRecoveryOtp')).toHaveLength(1)
  })

  it('records a late successful Recovery OTP only for its original tenant', async () => {
    const origin = fakeRemote({
      identity: null,
      config: { tenantId: 'origin-tenant', pollIntervalMs: 60_000, attachmentMaxBytes: 1_024, handleRecoveryPhoneEnabled: true },
    })
    const target = fakeRemote({
      identity: null,
      config: { tenantId: 'target-tenant', pollIntervalMs: 60_000, attachmentMaxBytes: 1_024, handleRecoveryPhoneEnabled: false },
    })
    let active = origin
    const controller = new AwikiController(new Proxy({} as AwikiRemote, {
      get: (_target, key) => Reflect.get(active.remote, key),
    }))
    controllers.push(controller)
    await controller.open()
    let finish!: () => void
    origin.remote.sendRecoveryOtp = request => {
      origin.calls.push({ method: 'sendRecoveryOtp', request })
      return new Promise(resolve => {
        finish = () => resolve(carried(success({
          operationId: 'origin-operation',
          fullHandle: request.fullHandle,
          retryAfterSeconds: 60,
          retryAt: '2099-01-01T00:01:00Z',
        })))
      })
    }

    const action = controller.sendRecoveryOtp({ fullHandle: 'alice.awiki.info', phone: '13800000000' })
    await waitFor(() => { expect(origin.calls.filter(call => call.method === 'sendRecoveryOtp')).toHaveLength(1) })
    await controller.switchTenant(async () => { active = target })
    finish()

    await expect(action).resolves.toMatchObject({ ok: true, value: { operationId: 'origin-operation' } })
    expect(controller.getSnapshot()).toMatchObject({
      sessionStatus: 'unregistered',
      recoveryOperationId: null,
      handleRecoveryPhoneEnabled: false,
    })
    expect(localStorage.getItem('awiki.handle-recovery.operation.v1.origin-tenant')).toBeNull()
    expect(localStorage.getItem('awiki.handle-recovery.operation.v1.target-tenant')).toBeNull()
    expect(localStorage.getItem('awiki.handle-recovery.retry-at.v1.origin-tenant.origin-operation')).toBe('2099-01-01T00:01:00.000Z')
    expect(target.calls.filter(call => call.method === 'getRecoveryStatus')).toHaveLength(0)
  })

  it('restores the original tenant Recovery cooldown after a late OTP succeeds while another tenant is active', async () => {
    let tenant = 'origin-tenant'
    let recoveryExists = false
    const b = setup({
      registered: false,
      config: {
        tenantId: tenant,
        pollIntervalMs: 60_000,
        attachmentMaxBytes: 1_024,
        handleRecoveryPhoneEnabled: true,
      },
      registrationOutcome: {
        status: 'join-required', fullHandle: 'alice.awiki.info' as never,
        mode: 'ordinary', requiresUserPresence: false,
      },
    })
    await enter()
    fireEvent.click(screen.getByRole('button', { name: '继续' }))
    await screen.findByRole('button', { name: '加入新设备（推荐）' })
    b.fake.remote.getConfig = () => carried(success({
      tenantId: tenant,
      pollIntervalMs: 60_000,
      attachmentMaxBytes: 1_024,
      handleRecoveryPhoneEnabled: tenant === 'origin-tenant',
    }))
    b.fake.remote.getIdentityAccessState = () => carried(success({
      choice: null,
      joining: false,
      recoveries: tenant === 'origin-tenant' && recoveryExists
        ? [{ operationId: 'late-operation', fullHandle: 'alice.awiki.info' }]
        : [],
    }))
    let finish!: () => void
    b.fake.remote.sendRecoveryOtp = request => {
      b.fake.calls.push({ method: 'sendRecoveryOtp', request })
      return new Promise(resolve => {
        finish = () => {
          recoveryExists = true
          resolve(carried(success({
            operationId: 'late-operation',
            fullHandle: request.fullHandle,
            retryAfterSeconds: 60,
            retryAt: new Date(Date.now() + 60_000).toISOString(),
          })))
        }
      })
    }

    fireEvent.click(screen.getByRole('button', { name: '恢复 Handle（会替换 DID）' }))
    fireEvent.click(await screen.findByRole('button', { name: '发送恢复验证码并替换 DID' }))
    await waitFor(() => { expect(b.fake.calls.filter(call => call.method === 'sendRecoveryOtp')).toHaveLength(1) })
    tenant = 'target-tenant'
    await b.controller.switchTenant(async () => {})
    finish()
    await waitFor(() => { expect(b.controller.getSnapshot().pending).toBeNull() })
    tenant = 'origin-tenant'
    await b.controller.switchTenant(async () => {})

    expect(await screen.findByRole('heading', { name: '验证身份归属' })).toBeTruthy()
    const resend = screen.getByRole<HTMLButtonElement>('button', { name: /秒后重新获取恢复验证码/ })
    expect(resend.disabled).toBe(true)
    fireEvent.click(resend)
    expect(b.fake.calls.filter(call => call.method === 'sendRecoveryOtp')).toHaveLength(1)
  })

  it('settles a mutation after close/reopen and rejects a duplicate while it is pending', async () => {
    const fake = fakeRemote({ identity: null })
    let finish!: () => void
    fake.remote.sendRegistrationOtp = () => new Promise(resolve => {
      finish = () => resolve({ ok: true, value: success({ retryAfterSeconds: 60, retryAt: '' }) })
    })
    const controller = new AwikiController(fake.remote)
    controllers.push(controller)
    await controller.open()
    const request = { handle: 'alice', phone: '13800000000' }
    const pending = controller.sendRegistrationOtp(request)
    controller.close()
    await controller.open()
    expect(controller.getSnapshot().pending).not.toBeNull()
    expect((await controller.sendRegistrationOtp(request)).ok).toBe(false)
    finish()
    expect((await pending).ok).toBe(true)
    expect(controller.getSnapshot().pending).toBeNull()
  })

  it('ignores an old discovery response after a newer panel lifecycle has loaded', async () => {
    const fake = fakeRemote({ identity: null })
    let finish!: () => void
    let requested = false
    fake.remote.getIdentityAccessState = () => {
      requested = true
      return new Promise(resolve => { finish = () => resolve({ ok: true, value: success({
        choice: null, joining: false, recoveries: [{ operationId: 'old-op', fullHandle: 'old.awiki.info' }],
      }) }) })
    }
    const controller = new AwikiController(fake.remote)
    controllers.push(controller)
    const first = controller.open()
    await waitFor(() => expect(requested).toBe(true))
    controller.close()
    fake.remote.getIdentityAccessState = () => carried(success({ choice: null, joining: false, recoveries: [] }))
    await controller.open()
    finish()
    await first
    expect(controller.getSnapshot().recoveryOperationId).toBeNull()
    expect(controller.getSnapshot().identityAccess?.recoveries).toEqual([])
    expect(fake.calls.some(call => call.method === 'getRecoveryStatus')).toBe(false)
  })

  it('does not let an old recovery bookmark replace the current session', async () => {
    const fake = fakeRemote({ recoveryProgress: { operationId: 'applied-op', fullHandle: 'alice.awiki.info',
      currentDid: 'did:wba:new-alice' as never, phase: 'applied', retryable: false,
      localOrdinaryDataWillMigrate: true, otherDevicesMustRejoin: true } })
    localStorage.setItem('awiki.handle-recovery.operation.v1', 'applied-op')
    let reads = 0
    fake.remote.getSession = () => carried(success({ status: 'active', identity: reads++ === 0 ? identity : { ...identity, did: 'did:wba:new-alice' as never } }))
    const controller = new AwikiController(fake.remote)
    controllers.push(controller)
    await controller.open()
    expect(reads).toBe(1)
    expect(controller.getSnapshot().identity?.did).toBe(identity.did)
    expect(fake.calls.some(call => call.method === 'getRecoveryStatus' || call.method === 'enterRecoveredSession')).toBe(false)
    expect(controller.getSnapshot().identityAccess?.recoveries).toEqual([])
    expect(controller.getSnapshot().recoveryOperationId).toBeNull()
    expect(fake.calls.some(call => call.method === 'listConversations')).toBe(true)
  })

})
