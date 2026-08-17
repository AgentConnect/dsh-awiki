# Optimistic sending bubble

- Text and attachment sends now render an outgoing bubble immediately while the Host confirms delivery.
- The pending bubble uses the existing loading icon and design tokens, with the animation positioned to the bubble's left and disabled under reduced-motion preferences.
- The former floating `发送消息…` and `发送附件…` notices are suppressed; other Host operation notices remain unchanged.
- Composer content clears when delivery starts and is restored only when the send fails in the same conversation.
- Component tests cover the pending bubble, accessible status, successful replacement, failure restoration, and attachment metadata minimization.
