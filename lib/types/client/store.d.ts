/** Root-scoped interaction state for the AWiki overlay. */
import { type EngineStoreHandle } from '@deepseek-ai/dsh-client-runtime/client';
/** State that survives the overlay entry's component remounts. */
export interface AwikiOverlayState {
    open: boolean;
}
type AwikiOverlayActions = {
    open: (draft: AwikiOverlayState) => void;
    close: (draft: AwikiOverlayState) => void;
    toggle: (draft: AwikiOverlayState) => void;
};
/**
 * Create the overlay's root-scoped interaction store.
 * @returns a fresh framework store handle.
 */
export declare function createAwikiOverlayStore(): EngineStoreHandle<AwikiOverlayState, AwikiOverlayActions>;
export {};
//# sourceMappingURL=store.d.ts.map