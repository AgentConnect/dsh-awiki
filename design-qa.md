# AWiki domain settings design QA

## Source reference

- User-provided dark-mode DeepSeek Harness settings screenshot.
- Dimensions: 1354 × 1506 pixels.
- SHA-256: `2b5e1649c6d902f1e1b5fb95a7e61844d916159096661b8e34d30c8757c09e06`.
- Requested placement: an AWiki entry directly below Agent Presets in the settings navigation.

## Implementation capture

- In-app browser capture of `http://127.0.0.1:3080/` after the persistence acceptance loop.
- Viewport/capture: 774 × 968 pixels.
- State: dark mode, Settings dialog open, AWiki section selected, domain reset to `awiki.ai`.
- SHA-256: `62d424ab637246e8b5e5863df6ca87b745f55ee38456016a021ef0ebe609d8c9`.

## Findings

- Placement matches the requested navigation location below Agent Presets.
- The new section follows the existing settings dialog typography, spacing, selected-row treatment, card surface, buttons, and dark theme.
- Domain copy clearly distinguishes a bare domain from a URL and states restart timing plus identity-safety behavior.
- The narrower acceptance viewport preserves the same hierarchy without clipping or horizontal overflow.
- Save, reload persistence, and restore-default states are visually legible and keyboard-accessible.

## Iteration history

1. Initial implementation rendered the correct section but degraded to a disabled state because the Host settings boundary did not expose the AWiki namespace.
2. Aligned namespace registration with Cordis lifecycle ownership and explicitly exposed the product setting through the Host configuration API.
3. Re-ran the browser loop: save `team.awiki.ai`, reload and confirm persistence, then restore `awiki.ai` and confirm the user override was removed.

## Final verdict

Passed.
