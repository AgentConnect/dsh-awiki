/** Root-scoped interaction state for the AWiki overlay. */
import { defineStore } from '@deepseek-ai/dsh-client-runtime/client';
/**
 * Create the overlay's root-scoped interaction store.
 * @returns a fresh framework store handle.
 */
export function createAwikiOverlayStore() {
    return defineStore({
        init: () => ({ open: false }),
        actions: {
            open: (draft) => { draft.open = true; },
            close: (draft) => { draft.open = false; },
            toggle: (draft) => { draft.open = !draft.open; },
        },
    });
}
//# sourceMappingURL=store.js.map