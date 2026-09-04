// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AwikiDeviceManagementSnapshot } from '@awiki/dsh-plugin/types'
import { AwikiDevices } from '../src/client/AwikiDevices.tsx'

afterEach(() => { cleanup() })

const memberSnapshot = {
  canManage: false,
  rootTransferSupported: false,
  role: 'member' as const,
  readiness: 'member' as const,
  devices: [{ deviceRef: 'device-current', status: 'active' as const, role: 'member' as const, managementReady: false, isCurrent: true }],
  requests: [],
}

const adminSnapshot = {
  canManage: true,
  rootTransferSupported: true,
  role: 'admin' as const,
  readiness: 'admin_ready' as const,
  devices: [
    { deviceRef: 'device-current', status: 'active' as const, role: 'admin' as const, managementReady: true, isCurrent: true },
    { deviceRef: 'device-member', status: 'active' as const, role: 'member' as const, managementReady: false, isCurrent: false },
  ],
  requests: [{
    requestRef: 'request-member', candidateKeyFingerprint: 'sha256:fixture',
    issuedAt: '2026-08-23T11:00:00Z', expiresAt: '2026-08-23T12:00:00Z', state: 'pending' as const,
    claimedByCurrentDevice: false, canStartVerification: true,
  }],
}

function mount(snapshot: AwikiDeviceManagementSnapshot) {
  const refreshDeviceManagement = vi.fn(async () => ({ ok: true as const, value: snapshot }))
  const startDeviceJoinVerification = vi.fn(async (request: { readonly requestRef: string }) => ({
    ok: true as const,
    value: { requestRef: request.requestRef, phase: 'sas-ready' as const, expiresAt: '2026-08-23T12:00:00Z', sas: '123456' },
  }))
  const approveDeviceJoin = vi.fn(async () => ({
    ok: true as const,
    value: { requestRef: 'request-member', phase: 'authorized' as const, expiresAt: '2026-08-23T12:00:00Z' },
  }))
  const rejectDeviceJoin = vi.fn(async () => ({
    ok: true as const,
    value: { requestRef: 'request-member', phase: 'rejected' as const, expiresAt: '2026-08-23T12:00:00Z' },
  }))
  const revokeDevice = vi.fn(async () => ({ ok: true as const, value: adminSnapshot }))
  const prepareRootTransfer = vi.fn(async () => ({
    ok: true as const,
    value: { transferRef: 'root-transfer-opaque', deviceRef: 'device-member', expiresAt: '2026-08-23T12:00:00Z' },
  }))
  const confirmRootTransfer = vi.fn(async () => ({ ok: true as const, value: { transferRef: 'root-transfer-opaque', acceptedAt: '2026-08-23T11:30:00Z' } }))
  render(<AwikiDevices {...{
    active: true,
    pending: false,
    refreshDeviceManagement,
    startDeviceJoinVerification,
    approveDeviceJoin,
    rejectDeviceJoin,
    revokeDevice,
    prepareRootTransfer,
    confirmRootTransfer,
  } as never} />)
  return { refreshDeviceManagement, startDeviceJoinVerification, approveDeviceJoin, rejectDeviceJoin, revokeDevice, prepareRootTransfer, confirmRootTransfer }
}

describe('AWiki device settings', () => {
  it('keeps member management read-only', async () => {
    const actions = mount(memberSnapshot)
    expect(await screen.findByText('当前设备不是可用的管理设备，不能批准或撤销其他设备。')).toBeTruthy()
    expect(screen.queryByRole('button', { name: '开始验证' })).toBeNull()
    expect(screen.queryByRole('button', { name: '拒绝' })).toBeNull()
    expect(screen.queryByRole('button', { name: '撤销' })).toBeNull()
    expect(actions.rejectDeviceJoin).not.toHaveBeenCalled()
    expect(actions.revokeDevice).not.toHaveBeenCalled()
  })

  it('requires SAS and explicit approval before authorizing a joining device', async () => {
    const actions = mount(adminSnapshot)
    expect(await screen.findByText('sha256:fixture')).toBeTruthy()
    expect(screen.getByText('待验证')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '开始验证' }))
    expect(await screen.findByText('123456')).toBeTruthy()
    const sasInput = screen.getByLabelText('手机安全码')
    const approvalInput = screen.getByLabelText('批准确认词')
    expect(sasInput.getAttribute('aria-describedby')).toBeTruthy()
    expect(document.getElementById(sasInput.getAttribute('aria-describedby') ?? '')?.textContent).toContain('手机上显示的 6 位数字')
    expect(approvalInput.getAttribute('aria-describedby')).toBeTruthy()
    expect(document.getElementById(approvalInput.getAttribute('aria-describedby') ?? '')?.textContent).toContain('输入 APPROVE')
    fireEvent.change(sasInput, { target: { value: '123456' } })
    fireEvent.change(approvalInput, { target: { value: 'APPROVE' } })
    fireEvent.click(screen.getByRole('button', { name: '批准为 member' }))
    await waitFor(() => {
      expect(actions.approveDeviceJoin).toHaveBeenCalledWith({
        requestRef: 'request-member', enteredSas: '123456', confirmation: 'APPROVE',
      })
    })
    await waitFor(() => { expect(actions.refreshDeviceManagement.mock.calls.length).toBeGreaterThanOrEqual(2) })
    expect(actions.startDeviceJoinVerification).toHaveBeenCalledTimes(1)
  })

  it('removes an authorized historical request from the pending list', async () => {
    mount({
      ...adminSnapshot,
      requests: [{
        ...adminSnapshot.requests[0]!,
        state: 'authorized',
        canStartVerification: false,
      }],
    })

    expect(await screen.findByText('暂时没有待处理的设备请求。')).toBeTruthy()
    expect(screen.queryByText('sha256:fixture')).toBeNull()
    expect(screen.queryByRole('button', { name: '拒绝' })).toBeNull()
  })

  it('sends reject, revoke, and Root Transfer only from explicit device actions', async () => {
    const actions = mount(adminSnapshot)
    expect(await screen.findByText('管理设备')).toBeTruthy()
    expect(screen.getByText('成员设备')).toBeTruthy()
    expect(screen.getAllByText('正常')).toHaveLength(2)
    fireEvent.click(await screen.findByRole('button', { name: '拒绝' }))
    await waitFor(() => { expect(actions.rejectDeviceJoin).toHaveBeenCalledWith({ requestRef: 'request-member', reason: 'user_rejected' }) })

    fireEvent.click(screen.getByRole('button', { name: '撤销' }))
    fireEvent.change(screen.getByLabelText('撤销确认词'), { target: { value: 'REVOKE' } })
    fireEvent.click(screen.getByRole('button', { name: '确认撤销' }))
    await waitFor(() => { expect(actions.revokeDevice).toHaveBeenCalledWith({ deviceRef: 'device-member', confirmation: 'REVOKE' }) })

    fireEvent.click(screen.getByRole('button', { name: '授予管理权' }))
    await waitFor(() => { expect(actions.prepareRootTransfer).toHaveBeenCalledWith({ deviceRef: 'device-member' }) })
    fireEvent.click(await screen.findByRole('button', { name: '使用系统认证并发送' }))
    await waitFor(() => { expect(actions.confirmRootTransfer).toHaveBeenCalledWith({ transferRef: 'root-transfer-opaque' }) })
    expect(await screen.findByText(/管理能力已发送/u)).toBeTruthy()
  })
})
