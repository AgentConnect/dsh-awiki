// @vitest-environment jsdom
import { Context } from '@deepseek-ai/cordis'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { AwikiClientBridge } from '../src/client/awiki-client-bridge.ts'
import { renderOverlay } from './helpers.overlay.tsx'

afterEach(cleanup)

it('supports companion onboarding without an inspection prop and preserves its notice across remounts', async () => {
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
    const message = '注册少于5位的handle需要使用邀请码，目前暂不支持自主注册。'
    expect(await screen.findByText(message)).toBeTruthy()
    expect(b.fake.calls.filter(call => call.method === 'inspectIdentityAccess')).toHaveLength(1)
    expect(b.fake.calls.filter(call => call.method === 'sendRegistrationOtp')).toHaveLength(0)
    first.unmount()
    mount()
    expect(await screen.findByText(message)).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Handle'), { target: { value: 'alice' } })
    expect(screen.queryByText(message)).toBeNull()
  } finally {
    cleanup()
    b.controller.dispose()
    await ctx.fiber.dispose()
  }
})
