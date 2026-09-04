// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { AwikiDeviceManagementSnapshot } from '@awiki/dsh-plugin/types'
import { AwikiDeviceJoinReminder } from '../src/client/AwikiDeviceJoinReminder.tsx'
import type { AwikiActionResult } from '../src/client/controller.ts'
import { success } from './helpers.client.ts'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

const pendingRequest = {
  requestRef: 'request-phone',
  candidateKeyFingerprint: 'sha256:phone-fixture',
  issuedAt: '2026-09-04T11:00:00Z',
  expiresAt: '2026-09-04T12:00:00Z',
  state: 'pending' as const,
  claimedByCurrentDevice: false,
  canStartVerification: true,
}

const adminSnapshot = (requests = [pendingRequest]): AwikiDeviceManagementSnapshot => ({
  canManage: true,
  rootTransferSupported: true,
  role: 'admin',
  readiness: 'admin_ready',
  devices: [{
    deviceRef: 'device-current',
    displayId: '7A3C-B9D2',
    status: 'active',
    role: 'admin',
    managementReady: true,
    isCurrent: true,
  }],
  requests,
})

function reminderProps(refreshDeviceManagement: () => Promise<AwikiActionResult<AwikiDeviceManagementSnapshot>>) {
  return {
    active: true,
    identityKey: 'did:wba:alice',
    pending: false,
    pollIntervalMs: 10,
    refreshDeviceManagement,
    startDeviceJoinVerification: vi.fn(async () => success({ requestRef: 'request-phone', phase: 'verifying' as const, expiresAt: pendingRequest.expiresAt })),
    approveDeviceJoin: vi.fn(async () => success({ requestRef: 'request-phone', phase: 'authorized' as const, expiresAt: pendingRequest.expiresAt })),
    rejectDeviceJoin: vi.fn(async () => success({ requestRef: 'request-phone', phase: 'rejected' as const, expiresAt: pendingRequest.expiresAt })),
    revokeDevice: vi.fn(async () => success(adminSnapshot([]))),
    prepareRootTransfer: vi.fn(async () => success({ transferRef: 'transfer-1', deviceRef: 'device-current', expiresAt: pendingRequest.expiresAt })),
    confirmRootTransfer: vi.fn(async () => success({ deviceRef: 'device-current', acceptedAt: pendingRequest.issuedAt })),
  }
}

describe('AwikiDeviceJoinReminder', () => {
  it('alerts a ready-admin and opens device management directly', async () => {
    const refresh = vi.fn(async () => success(adminSnapshot()))
    render(<AwikiDeviceJoinReminder {...reminderProps(refresh)} />)

    const dialog = await screen.findByRole('dialog', { name: '有新设备请求加入' })
    expect(dialog.textContent).toContain('sha256:phone-fixture')
    fireEvent.click(screen.getByRole('button', { name: '立即处理' }))

    expect(await screen.findByRole('region', { name: 'AWiki 设备管理' })).toBeTruthy()
  })

  it('does not repeat a dismissed request and alerts when a different request arrives', async () => {
    let snapshot = adminSnapshot()
    const refresh = vi.fn(async () => success(snapshot))
    render(<AwikiDeviceJoinReminder {...reminderProps(refresh)} />)

    const dialog = await screen.findByRole('dialog', { name: '有新设备请求加入' })
    fireEvent.click(within(dialog).getByText('稍后处理'))
    const callsAfterDismiss = refresh.mock.calls.length
    await waitFor(() => { expect(refresh.mock.calls.length).toBeGreaterThan(callsAfterDismiss) })
    expect(screen.queryByRole('dialog', { name: '有新设备请求加入' })).toBeNull()

    snapshot = adminSnapshot([{ ...pendingRequest, requestRef: 'request-tablet', candidateKeyFingerprint: 'sha256:tablet-fixture' }])
    const nextDialog = await screen.findByRole('dialog', { name: '有新设备请求加入' })
    expect(nextDialog.textContent).toContain('sha256:tablet-fixture')
  })

  it('stays silent for a member device', async () => {
    vi.useFakeTimers()
    const refresh = vi.fn(async () => success({
      canManage: false,
      rootTransferSupported: true,
      role: 'member' as const,
      readiness: 'member_ready' as const,
      devices: [],
      requests: [pendingRequest],
    }))
    render(<AwikiDeviceJoinReminder {...reminderProps(refresh)} />)

    await vi.advanceTimersByTimeAsync(0)
    expect(refresh).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(50)
    expect(refresh).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog', { name: '有新设备请求加入' })).toBeNull()
  })

  it('does not alert for an already authorized historical request', async () => {
    const refresh = vi.fn(async () => success(adminSnapshot([{
      ...pendingRequest,
      state: 'authorized',
      canStartVerification: false,
    }])))
    render(<AwikiDeviceJoinReminder {...reminderProps(refresh)} />)

    await waitFor(() => { expect(refresh).toHaveBeenCalled() })
    expect(screen.queryByRole('dialog', { name: '有新设备请求加入' })).toBeNull()
  })
})
