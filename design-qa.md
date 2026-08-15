# AWiki settings design QA

## Domain configuration QA

### Source reference

- User-provided dark-mode DeepSeek Harness settings screenshot.
- Dimensions: 1354 × 1506 pixels.
- SHA-256: `2b5e1649c6d902f1e1b5fb95a7e61844d916159096661b8e34d30c8757c09e06`.
- Requested placement: an AWiki entry directly below Agent Presets in the settings navigation.

### Implementation capture

- In-app browser capture of `http://127.0.0.1:3080/` after the persistence acceptance loop.
- Viewport/capture: 774 × 968 pixels.
- State: dark mode, Settings dialog open, AWiki section selected, domain reset to `awiki.ai`.
- SHA-256: `62d424ab637246e8b5e5863df6ca87b745f55ee38456016a021ef0ebe609d8c9`.

### Findings

- Placement matches the requested navigation location below Agent Presets.
- The new section follows the existing settings dialog typography, spacing, selected-row treatment, card surface, buttons, and dark theme.
- Domain copy clearly distinguishes a bare domain from a URL and states restart timing plus identity-safety behavior.
- The narrower acceptance viewport preserves the same hierarchy without clipping or horizontal overflow.
- Save, reload persistence, and restore-default states are visually legible and keyboard-accessible.

### Iteration history

1. Initial implementation rendered the correct section but degraded to a disabled state because the Host settings boundary did not expose the AWiki namespace.
2. Aligned namespace registration with Cordis lifecycle ownership and explicitly exposed the product setting through the Host configuration API.
3. Re-ran the browser loop: save `team.awiki.ai`, reload and confirm persistence, then restore `awiki.ai` and confirm the user override was removed.

### Final verdict

Passed.

## Local-data reset QA

### Reference

- Source image: `/var/folders/2k/sbpv92td6qldrfzhbfs161_r0000gn/T/codex-clipboard-fb0df28b-221c-4ad2-bf99-8ffda6c00be2.png`
- Source dimensions: 2582 × 1898
- Relevant target: the existing dark-theme AWiki settings page inside the native DeepSeek Harness settings shell.

### Implementation capture

- Screenshot: `/private/tmp/dsh-awiki-clear-settings.png`
- Browser viewport and screenshot dimensions: 1280 × 720
- State: destructive confirmation dialog open before any confirmation text is entered.

### Comparison

- Layout: the existing settings navigation, heading, domain card, and identity notice remain unchanged. A bordered danger zone is appended below them, and the second confirmation uses the native centered modal.
- Hierarchy: irreversible effects and the local-secret deletion scope are presented before the confirmation input. The server-account boundary is visually secondary but remains in the same warning card.
- Styling: the new controls inherit the product's typography, spacing, surfaces, borders, and dark theme. Red is reserved for the destructive region, warning copy, and destructive action.
- Interaction: the final action starts disabled, stays disabled for an inexact phrase, becomes enabled only for the exact phrase `永久清空`, and Cancel closes the dialog without calling the clear operation.
- Safety: browser QA used an isolated Harness home and an isolated AWiki state path. The final destructive action was never clicked, and no QA state file was created.

### Result

PASS for the requested desktop dark-theme settings flow. The 1280 × 720 implementation preserves the existing settings composition and clearly separates the irreversible operation from ordinary domain configuration.
