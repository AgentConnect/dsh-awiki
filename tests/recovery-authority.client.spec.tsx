// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { AwikiRecoveryProgress } from '../src/types.ts'
import { AwikiRecoveryForm } from '../src/client/AwikiRecoveryForm.tsx'

afterEach(() => { cleanup(); vi.useRealTimers() })

function show(overrides: Partial<AwikiRecoveryProgress>) {
  const progress: AwikiRecoveryProgress = {
    operationId: 'operation', fullHandle: 'alice.example', currentDid: 'did:wba:example:alice' as never,
    phase: 'identity_transition_pending', retryable: true, allowedActions: [],
    localOrdinaryDataWillMigrate: true, otherDevicesMustRejoin: true, ...overrides,
  }
  const actions = {
    sendRecoveryOtp: vi.fn(), prepareRecovery: vi.fn(), activateRecovery: vi.fn(),
    refreshRecoveryStatus: vi.fn().mockResolvedValue({ ok: true, value: progress }),
    resumeRecovery: vi.fn().mockResolvedValue({ ok: true, value: progress }),
    discardRecovery: vi.fn(),
  }
  render(<AwikiRecoveryForm {...actions} operationId="operation" progress={progress} pending={false} />)
  return actions
}

it('a superseded operation never resumes from its old phase or retryable flag', async () => {
  vi.useFakeTimers()
  const actions = show({ failureCode: 'local_transition_superseded' })
  await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
  expect(actions.resumeRecovery).not.toHaveBeenCalled()
  expect(screen.getByText(/此恢复操作已由更新的身份状态关闭/u)).toBeDefined()
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '重新检查恢复结果' })) })
  expect(actions.refreshRecoveryStatus).toHaveBeenCalledTimes(1)
  expect(actions.resumeRecovery).not.toHaveBeenCalled()
  expect(screen.queryByRole('button', { name: '确认并恢复身份' })).toBeNull()
})

it('ready_to_commit without Core activation authority cannot activate or discard', () => {
  const actions = show({ phase: 'ready_to_commit', allowedActions: undefined })
  expect(screen.queryByRole('button', { name: '确认并恢复身份' })).toBeNull()
  expect(screen.queryByRole('button', { name: '取消恢复' })).toBeNull()
  expect(actions.activateRecovery).not.toHaveBeenCalled()
  expect(actions.discardRecovery).not.toHaveBeenCalled()
})

it('Core-authorized resume runs once automatically', async () => {
  vi.useFakeTimers()
  const actions = show({ allowedActions: ['resume'] })
  await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
  expect(actions.resumeRecovery).toHaveBeenCalledTimes(1)
  await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
  expect(actions.resumeRecovery).toHaveBeenCalledTimes(1)
})
