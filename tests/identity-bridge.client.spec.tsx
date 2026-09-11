// @vitest-environment jsdom
import { Context } from '@deepseek-ai/cordis'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { AwikiClientBridge } from '../src/client/awiki-client-bridge.ts'
import { renderOverlay } from './helpers.overlay.tsx'

afterEach(cleanup)

it('supports companion onboarding without an inspection prop and sends short Handle OTP without a lookup', async () => {
  const b = renderOverlay({ registered: false })
  await act(async () => { await b.controller.open() })
  cleanup()
  const ctx = new Context()
  const bridge = new AwikiClientBridge(ctx, b.controller)
  const IdentityAccess = bridge.IdentityAccess
  const { inspectIdentityAccess: _inspection, ...actions } = b.props
  const mount = () => render(<IdentityAccess {...actions}
    sessionStatus="unregistered" recoveryOperationId={null} recoveryProgress={null}
    pending={false} />)
  try {
    const first = mount()
    fireEvent.change(await screen.findByLabelText('Handle'), { target: { value: 'q7xz' } })
    fireEvent.change(screen.getByLabelText('手机号'), { target: { value: '+15555550123' } })
    fireEvent.click(screen.getByRole('button', { name: '获取验证码' }))
    expect(await screen.findByLabelText('注册验证码')).toBeTruthy()
    expect(b.fake.calls.filter(call => call.method === 'inspectIdentityAccess')).toHaveLength(0)
    expect(b.fake.calls.filter(call => call.method === 'sendRegistrationOtp')).toHaveLength(1)
    first.unmount()
    mount()
    expect(await screen.findByLabelText('注册验证码')).toBeTruthy()
    expect(screen.getByLabelText('Handle')).toHaveProperty('value', 'q7xz')
  } finally {
    cleanup()
    b.controller.dispose()
    await ctx.fiber.dispose()
  }
})
