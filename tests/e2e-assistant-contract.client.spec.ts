// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import {
  DSH_ASSISTANT_MESSAGE_CONTRACT,
  exactAssistantResponseCount,
} from './e2e/pages/harness-assistant-contract.ts'

afterEach(() => { document.body.replaceChildren() })

describe('immutable DSH assistant-message DOM contract', () => {
  it('times out when only the user prompt contains the expected response substring', async () => {
    document.body.innerHTML = [
      '<div data-chat-flow-kind="user">Return MODEL-RECOVERY-OK exactly.</div>',
      '<div data-chat-flow-kind="turn-tail">Deep diving...</div>',
    ].join('')

    expect(exactAssistantResponseCount(document, 'MODEL-RECOVERY-OK')).toBe(0)
    await expect(expect.poll(
      () => exactAssistantResponseCount(document, 'MODEL-RECOVERY-OK'),
      { timeout: 50, interval: 10 },
    ).toBe(1)).rejects.toThrow()
  })

  it('accepts only exact text in the pinned assistant-step container', () => {
    document.body.innerHTML = [
      '<div data-chat-flow-kind="assistant-step">MODEL-RECOVERY-OK</div>',
      '<div data-chat-flow-kind="assistant-step">prefix MODEL-RECOVERY-OK suffix</div>',
      '<article>MODEL-RECOVERY-OK</article>',
    ].join('')

    expect(DSH_ASSISTANT_MESSAGE_CONTRACT).toEqual({
      packageVersion: '0.1.1-rc.2',
      sourceCommit: '6d09b3168d035f7668ea73b745a115be1dc7eaac',
      selector: '[data-chat-flow-kind="assistant-step"]',
    })
    expect(exactAssistantResponseCount(document, 'MODEL-RECOVERY-OK')).toBe(1)
  })
})
