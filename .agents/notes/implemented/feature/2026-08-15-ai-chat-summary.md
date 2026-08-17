# AI conversation summary

## Scope

- Added a replaceable AWiki summary-provider slot and `summarizeConversation` Remote while preserving the existing SDK provider boundary.
- The Host owns real-history reads, unread/recent selection, the 50-message cap, UTF-8 cropping, attachment-metadata minimization, source provenance, and closed public failures.
- `dsh-awiki/summary-provider` consumes the current `llm` and `agentDefaultModel` services for one direct stream. It creates no Agent, writes no session, rejects tool calls, truncation, missing terminal output, empty output, and invalid JSON.
- The Web client keeps one runtime-only cache per conversation. It calls the model only on explicit generate/regenerate actions and marks results stale after newer messages without an automatic request.

## Product behavior

- The thread header owns the AI Summary action.
- The inline result stays above history and below the header, with loading, success, collapsed, stale, and error states.
- Structured Chinese copy, source-message scrolling, regenerate, keyboard focus, live regions, and accessible button names are part of the interaction contract.
- The payload contains text and attachment filename, MIME, size, and caption only. Conversation JSON is explicitly framed as untrusted data.

## Validation contract

- Host and provider tests cover unread/recent scope, 50-message and byte cropping, attachment binary exclusion, prompt-injection framing, current default route, timeout/cancellation, tool calls, truncation, empty/invalid output, and absent providers.
- Client tests cover no-click/no-call, per-conversation cache, stale marking, generate/regenerate, collapse, structured copy, source scrolling, and retryable errors.
- Visual acceptance compares the selected reference and the same-state implementation at one viewport; final evidence is recorded in `design-qa.md`.
