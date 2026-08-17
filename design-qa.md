# AWiki Rust SDK plus AI conversation summary design QA

## Visual truth and normalized evidence

- Selected Product Design direction: first visible ideation option.
- Source visual truth: `/Users/howard/.codex/generated_images/019fffb8-438a-7843-9f5c-4727f0ae2741/exec-7d2c67dc-f6f9-4f23-82bc-55d91a4614a6.png`.
- Source pixels: 1274 × 1234, SHA-256 `9e9b5bb39e8869a0b011e5fdecd284e0acc48a4bcb1b8f27d7f2e4c562440d5f`.
- Browser viewport for the matched desktop state: 1274 × 1234 CSS pixels. Browser capture density was normalized by the Browser API to one output pixel per CSS pixel.
- Browser-rendered implementation: `/private/tmp/dsh-awiki-rust-summary-success-postfix.png`, 1274 × 1234 pixels, SHA-256 `9229704aed7481ea52cce7cedff05f4d4014ec0358ad923fdf02546c23ad8875`.
- Product-surface crop: `/private/tmp/dsh-awiki-rust-summary-success-postfix-dialog.png`, 722 × 722 pixels, SHA-256 `e51b207c17c469032bdffc0a0c47b4af64324c5b7f909ad4afdb8fefe130741c`.
- Same-input comparison: `/private/tmp/dsh-awiki-rust-summary-comparison-postfix.png`, 1468 × 722 pixels, SHA-256 `ab408b321b2b840b4eac64b34f60e77562fd89ccfadb811e9e9373fe47a9216c`. The 1274 × 1234 source was aspect-preservingly scaled to 746 × 722 and placed beside the 722 × 722 implementation crop.
- Matched state: dark theme, selected direct conversation, expanded successful unread-range summary, visible history and composer.

## Full-view and focused comparison

- The full product-dialog comparison preserves the required 720-pixel floating AWiki window, left identity/conversation rail, thread header, inline summary, history, and composer.
- The reference artwork is slightly wider and lets the summary occupy more vertical space. The implementation intentionally preserves the existing 720-pixel product window and caps the independently scrollable summary near one third of the thread height, as required; history and composer remain usable.
- A separate smaller crop was not needed: the 722-pixel dialog comparison keeps header icons, typography, summary actions, message bubbles, borders, and the composer readable at native output density.

## Required fidelity surfaces

- Fonts and typography: existing Harness font stack, optical weights, hierarchy, line height, truncation, and CJK wrapping remain consistent. The summary title, range, group headings, list text, and action labels are distinguishable without introducing a new type scale.
- Spacing and layout rhythm: the 722 × 722 dialog retains the existing two-column grid, header and composer heights, radii, borders, and compact message density. The summary is directly below the thread header and uses internal overflow instead of hiding persistent controls.
- Colors and visual tokens: the implementation uses existing Harness dark surfaces, borders, focus treatment, foregrounds, muted text, status green, and action colors. No new palette or gradient system was introduced.
- Image and icon fidelity: the target contains no custom raster imagery. All visible actions use the existing icon library and UI primitives; there are no handwritten SVGs, emoji substitutes, CSS drawings, or placeholder assets.
- Copy and content: the exact range is visible as `未读以来 · 4 条消息 · 10:42–10:48`; all three structured groups, source/regenerate/copy actions, and the attachment-privacy notice are present. The Rust migration copy now explicitly says the local Rust SDK restores the same DID, Handle, and message database.

## Browser interaction acceptance

- Ungenerated: selecting the conversation exposed `生成 AI 总结`; component coverage proves no provider call occurs without the click.
- Loading: the button became disabled with `正在生成 AI 总结`, and the named live region announced `正在整理这段对话…`. Evidence: `/private/tmp/dsh-awiki-rust-summary-loading.png`, 1274 × 1234, SHA-256 `afac8b4ff19fd1a547b7392d9425201e58d648baef5b546eab083510b88fd6b2`.
- Success: all range metadata and structured groups rendered in a named `AI 对话总结` region.
- Collapse and expand: the cached result became a compact `展开 AI 对话总结` control and restored without another model call.
- Regenerate: the second explicit click displayed loading and replaced the visible summary content.
- Copy: the browser control changed to `已复制`; the exact structured Chinese clipboard payload is covered by component tests. The in-app browser did not expose the page clipboard payload back to automation.
- View source: the summary collapsed, and focus moved to `summary-message-1` with `tabindex=-1`.
- Stale: sending one local-fixture message retained the cached summary and exposed `根据新消息重新生成 AI 总结`; no automatic regeneration occurred.
- Error: the third fixture call displayed the public actionable message `暂时无法生成 AI 总结，请检查模型连接后重试。`. Evidence: `/private/tmp/dsh-awiki-rust-summary-error.png`, 1274 × 1234, SHA-256 `aa8aeb48c788c67614f0a0676fc6cb724cf093da51a6a48dcc1df05b9439ab56`.
- Rust session: logout showed a signed-out surface without deleting identity data; `重新进入` restored Alice and the conversation list. The post-fix confirmation copy is visible in `/private/tmp/dsh-awiki-rust-session-copy-postfix.png`, 774 × 968, SHA-256 `4c43b6996d4b7138a98789d0f7a4ddcfd197b37a20e218caa6bc9c7e6da8fd52`.
- Responsive: at 600 × 900 CSS pixels, the dialog measured 546 × 722, body scroll width stayed 600, and the successful summary measured 528 × 192 without horizontal overflow. Evidence: `/private/tmp/dsh-awiki-rust-summary-responsive.png`, SHA-256 `aa64386713bbf1b77d39f68b72dc396921777afe00980bafd57451a591261116`.
- Accessibility: the action and collapse controls expose expanded semantics; the result is a named live region; loading is a status and failure is an alert; source focus is programmatically reachable. Keyboard, reduced-motion, and responsive semantics remain covered by the 162-test suite.
- Console: the final stable server load and the retained success-state tab produced no browser warnings or errors. Earlier connection warnings were caused only by the intentional local server restart and are not present on the clean final load.

## Comparison history

1. Initial combined comparison found no summary-layout P0/P1/P2 regression, but browser inspection found one P2 migration-copy drift in the logout confirmation: it described restoration from `SecretVault` without naming the new Rust SDK owner.
2. The copy was changed to `由本机 Rust SDK 恢复同一个 DID、Handle 和消息数据库`, the client was rebuilt, public/generated gates and all 162 tests were rerun, and the integrated Harness service was restarted.
3. The post-fix dialog comparison is visually unchanged in the primary summary state, the corrected Rust copy is browser-visible, the responsive state remains stable, and the final clean console is empty.

## Findings

- P0: none.
- P1: none.
- P2: none remaining.
- P3: the reference shows more summary content above the fold because its window is slightly wider and the summary is taller. The implementation keeps the explicit one-third cap and internal scrolling, so this remains an intentional product constraint rather than a blocking mismatch.

final result: passed
