/** Immutable DeepSeek Harness assistant-row contract used by Recovery E2E. */

export const DSH_ASSISTANT_MESSAGE_CONTRACT = Object.freeze({
  packageVersion: '0.1.1-rc.2',
  sourceCommit: '6d09b3168d035f7668ea73b745a115be1dc7eaac',
  selector: '[data-chat-flow-kind="assistant-step"]',
})

/** Exact DOM oracle used by component regression tests. */
export function exactAssistantResponseCount(root: ParentNode, expectedText: string): number {
  return [...root.querySelectorAll(DSH_ASSISTANT_MESSAGE_CONTRACT.selector)]
    .filter(element => element.textContent?.trim() === expectedText)
    .length
}
