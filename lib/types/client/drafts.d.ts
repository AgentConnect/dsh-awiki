/** UI-only memory. Never serialize authentication inputs, File objects, or grants. */
import { type ReactNode, type SetStateAction } from 'react';
export declare class AwikiDraftStore {
    private scope;
    private flowScope;
    private tenant;
    private readonly epochs;
    epoch: (scope: string) => number;
    private drop;
    private readonly scopes;
    private readonly listeners;
    private revision;
    subscribe: (listener: () => void) => () => void;
    getSnapshot: () => number;
    getScope: (key: string) => string;
    private publish;
    setScope(tenant: string, owner?: string): void;
    read<Value>(scope: string, key: string, initial: Value, dirty: boolean): Value;
    write<Value>(scope: string, key: string, value: SetStateAction<Value>, initial: Value, dirty: boolean, epoch?: number): void;
    clearFlow(): void;
    clearScope(): void;
    clear(): void;
    hasUnsavedChanges: () => boolean;
}
export declare function AwikiDraftProvider({ store, children }: {
    store?: AwikiDraftStore | undefined;
    children: ReactNode;
}): import("react").JSX.Element;
/** Keyed by owner and form/conversation. Late callbacks retain their original scope. */
export declare function useDraftState<Value>(key: string, initial: Value, dirty?: boolean): [Value, (value: SetStateAction<Value>) => void];
//# sourceMappingURL=drafts.d.ts.map