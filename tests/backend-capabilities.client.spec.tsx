// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { AwikiIdentityAccess } from '../src/client/AwikiIdentityAccess.tsx'
import { renderOverlay } from './helpers.overlay.tsx'

afterEach(cleanup)
it('offers Continue and registers handle-only without OTP or synthetic contact', async () => {
  const b = renderOverlay({ registered: false })
  try {
    await act(async () => { await b.controller.open() })
    cleanup()
    render(<AwikiIdentityAccess {...b.props}
      access={{ choice: null, joining: false, recoveries: [], creationMethods: ['wba'], pendingRegistrations: [], registrationHandleOnly: true }}
      sessionStatus="unregistered" recoveryOperationId={null} recoveryProgress={null} pending={false} />)
    expect(screen.queryByLabelText('手机号')).toBeNull()
    expect(screen.queryByRole('button', { name: '获取验证码' })).toBeNull()
    fireEvent.change(screen.getByLabelText('Handle'), { target: { value: 'candidate' } })
    fireEvent.click(screen.getByRole('button', { name: '继续', exact: true }))
    await waitFor(() => { expect(b.fake.calls.filter(c => c.method === 'registerIdentity')).toHaveLength(1) })
    expect(b.fake.calls.find(c => c.method === 'registerIdentity')?.request).toMatchObject({ handle: 'candidate', phone: '', otp: '' })
    expect(b.fake.calls.filter(c => c.method === 'sendRegistrationOtp')).toHaveLength(0)
  } finally { b.controller.dispose() }
})
