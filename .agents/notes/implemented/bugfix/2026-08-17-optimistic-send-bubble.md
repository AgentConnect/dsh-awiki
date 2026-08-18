# Optimistic sending bubble

- Text and attachment sends now render an outgoing bubble immediately while the Host confirms delivery.
- The pending bubble uses the existing loading icon and design tokens, with the animation positioned to the bubble's left and disabled under reduced-motion preferences.
- The former floating `发送消息…` and `发送附件…` notices are suppressed; other Host operation notices remain unchanged.
- Composer content clears when delivery starts and is restored only when the send fails in the same conversation.
- Every browser send now mints one Core-valid logical message ID and carries it through the existing idempotency key field. The Rust adapter recognizes only the exact `msg-UUID` format and forwards it as the Core client message ID without widening the strict Remote schema. If local-first reconciliation observes that committed ID before the send request settles, the optimistic row is replaced immediately instead of rendering a second bubble.
- Reconciliation is exact-ID based, so separate messages with identical text and timestamps remain separate rows.
- Component tests cover the pending bubble, accessible status, early local-commit replacement, successful replacement, failure restoration, and attachment metadata minimization. Controller and adapter tests pin logical-message-ID propagation for text and attachments.
