# AWiki AI conversation summary design QA

## Visual source and acceptance state

- Selected Product Design direction: the first visible ideation option.
- Source image: `/Users/howard/.codex/generated_images/019fffb8-438a-7843-9f5c-4727f0ae2741/exec-7d2c67dc-f6f9-4f23-82bc-55d91a4614a6.png`
- Source dimensions: 1274 × 1234 pixels.
- Source SHA-256: `9e9b5bb39e8869a0b011e5fdecd284e0acc48a4bcb1b8f27d7f2e4c562440d5f`.
- Implementation capture: `/private/tmp/dsh-awiki-summary-success.png`
- Implementation dimensions: 1274 × 1234 pixels.
- Implementation SHA-256: `7e5076964e8f97b03ae83f50b0f66dec59a3d0a5d396b5ba17fbf0564fb274e4`.
- Combined side-by-side comparison: `/private/tmp/dsh-awiki-summary-comparison.png`
- Comparison dimensions: 2548 × 1234 pixels.
- Comparison SHA-256: `5984c0a221462ec791960f97a180b3c4868963ecde2a71e2765f668f38fa3191`.
- Matched state: dark theme, selected direct conversation, expanded successful summary, unread-based range, four summarized messages, visible history and composer.

## Image-to-code findings

- The implementation preserves the existing 720-pixel AWiki floating window, identity/conversation rail, thread history, and composer instead of expanding the reference crop into a new page.
- The AI action is part of the selected thread header and uses the existing icon library and button primitives.
- The summary is an inline region immediately below the header and above the history. Its height is capped at approximately one third of the thread area; overflow remains inside the summary while the message history and composer remain usable.
- The visual hierarchy follows the reference: title and exact range first, then highlights, conclusions, todos, source/regenerate/copy actions, and the privacy notice.
- Existing Harness surfaces, borders, radii, typography, focus treatment, colors, and reduced-motion behavior are reused. No handwritten SVG or new visual system was introduced.

## Interaction acceptance

- Ungenerated: selecting a conversation exposes the `生成 AI 总结` action without making a model call.
- Loading: the trigger becomes disabled and reads `正在生成 AI 总结`; the region announces `正在整理这段对话…`. Capture: `/private/tmp/dsh-awiki-summary-loading.png`.
- Success: the browser displayed `未读以来 · 4 条消息 · 10:42–10:48` plus all three structured groups and the privacy notice.
- Collapse/expand: both controls preserve the cached summary and expose correct expanded semantics.
- Regenerate: a second explicit click showed loading and then replaced the summary content.
- Copy: the control changed to `已复制`; component tests verify the exact structured Chinese clipboard payload.
- View source: the summary collapsed and focus moved to the first included message (`summary-message-1`, `tabindex=-1`).
- Stale: sending a new fixture message retained the current summary and exposed `根据新消息重新生成 AI 总结`; no automatic call occurred.
- Error: the provider failure was normalized to the actionable public message `暂时无法生成 AI 总结，请检查模型连接后重试。`. Capture: `/private/tmp/dsh-awiki-summary-error.png`, SHA-256 `ae4dd77a37e907c7d6bddb3beca045c5bcec443953d6656df7e5e3f44a559b27`.
- Responsive: at 600 × 900 the AWiki dialog and summary region remained present without a new route or sidebar. Capture: `/private/tmp/dsh-awiki-summary-responsive.png`, SHA-256 `f5bfb7c5547cbd5f3aa4db5afcc30f78dcd4a5c6faa71996ec2538ef592dfdd5`.
- Accessibility: the header action exposes `aria-controls` and `aria-expanded`; the result uses a named region with `aria-live=polite`; loading, error, stale, collapse, and source-focus semantics were covered by browser and component acceptance.
- Final clean browser load produced no console warnings or errors.

## Severity review

- P0: none.
- P1: none.
- P2: none after comparison. The reference artwork lets the floating window fill the entire image, while the implementation intentionally retains the product requirement of a 720-pixel floating window inside the full Harness viewport; this is a framing difference, not an implementation mismatch.

final result: passed
