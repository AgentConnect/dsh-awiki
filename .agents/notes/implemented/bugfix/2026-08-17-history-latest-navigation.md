# Message history latest navigation

- Conversation selection now renders its loading state inside the message-history region instead of over the composer.
- The first completed history page reliably scrolls to the newest message, including image-preview height changes.
- Scrolling away from the bottom reveals an accessible down-arrow control. It remains icon-only without new arrivals, then adds `新消息（N）` as newer messages are appended.
- New arrivals do not force a reader away from older content. Activating the control returns to the latest message and clears the counter.
- Initial history pages and older-page prepends do not increase the new-message counter.
- Component coverage exercises deferred loading, initial bottom positioning, the no-new-message arrow, polling-driven counting, click-to-latest, and reduced-motion-compatible loading semantics.
