/** Root-scoped interaction state for the AWiki overlay. */

import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-runtime/client'

/** State that survives the overlay entry's component remounts. */
export interface AwikiOverlayState {
  open: boolean
}

type AwikiOverlayActions = {
  open: (draft: AwikiOverlayState) => void
  close: (draft: AwikiOverlayState) => void
  toggle: (draft: AwikiOverlayState) => void
}

/**
 * Create the overlay's root-scoped interaction store.
 * @returns a fresh framework store handle.
 */
export function createAwikiOverlayStore(): EngineStoreHandle<AwikiOverlayState, AwikiOverlayActions> {
  return defineStore({
    init: (): AwikiOverlayState => ({ open: false }),
    actions: {
      open: (draft) => { draft.open = true },
      close: (draft) => { draft.open = false },
      toggle: (draft) => { draft.open = !draft.open },
    },
  })
}
