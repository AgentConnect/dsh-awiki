import { jsx as _jsx } from "react/jsx-runtime";
/** UI-only memory. Never serialize authentication inputs, File objects, or grants. */
import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore } from 'react';
export class AwikiDraftStore {
    scope = 'initial';
    flowScope = 'initial';
    tenant = 'initial';
    epochs = new Map();
    epoch = (scope) => this.epochs.get(scope) ?? 0;
    drop(scope) { this.scopes.delete(scope); this.epochs.set(scope, this.epoch(scope) + 1); }
    scopes = new Map();
    listeners = new Set();
    revision = 0;
    subscribe = (listener) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
    getSnapshot = () => this.revision;
    getScope = (key) => key.startsWith('settings:tenant-') ? 'tenant-settings'
        : key.startsWith('identity:') || key.startsWith('recovery:') ? this.flowScope : this.scope;
    publish() { this.revision++; for (const listener of this.listeners)
        listener(); }
    setScope(tenant, owner = tenant) {
        const scope = JSON.stringify([tenant, owner]);
        if (scope === this.scope)
            return;
        const nextFlow = JSON.stringify([tenant, 'identity-flow']);
        if (tenant !== this.tenant) {
            this.drop(this.flowScope);
            this.drop(nextFlow);
        }
        this.tenant = tenant;
        this.flowScope = nextFlow;
        this.scope = scope;
        this.publish();
    }
    read(scope, key, initial, dirty) {
        let cells = this.scopes.get(scope);
        if (cells === undefined) {
            cells = new Map();
            this.scopes.set(scope, cells);
        }
        let cell = cells.get(key);
        if (cell === undefined) {
            cell = { value: initial, initial, dirty };
            cells.set(key, cell);
        }
        return cell.value;
    }
    write(scope, key, value, initial, dirty, epoch = this.epoch(scope)) {
        if (epoch !== this.epoch(scope))
            return;
        const previous = this.read(scope, key, initial, dirty);
        const next = typeof value === 'function' ? value(previous) : value;
        if (Object.is(previous, next))
            return;
        this.scopes.get(scope).get(key).value = next;
        this.publish();
    }
    clearFlow() { this.drop(this.flowScope); this.publish(); }
    clearScope() { this.drop(this.scope); this.drop(this.flowScope); this.publish(); }
    clear() { for (const scope of this.scopes.keys())
        this.drop(scope); this.publish(); }
    hasUnsavedChanges = () => [...this.scopes.values()].some(cells => [...cells.values()].some(cell => cell.dirty && !Object.is(cell.value, cell.initial)));
}
const DraftContext = createContext(undefined);
export function AwikiDraftProvider({ store, children }) {
    useEffect(() => {
        if (store === undefined)
            return;
        const guard = (event) => {
            if (!store.hasUnsavedChanges())
                return;
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', guard);
        return () => { window.removeEventListener('beforeunload', guard); };
    }, [store]);
    return _jsx(DraftContext.Provider, { value: store, children: children });
}
/** Keyed by owner and form/conversation. Late callbacks retain their original scope. */
export function useDraftState(key, initial, dirty = true) {
    const store = useContext(DraftContext);
    const [local, setLocal] = useState(initial);
    useSyncExternalStore(store?.subscribe ?? (() => () => { }), store?.getSnapshot ?? (() => 0));
    const scope = store?.getScope(key) ?? '';
    const epoch = store?.epoch(scope) ?? 0;
    const set = useCallback((value) => {
        if (store === undefined)
            setLocal(value);
        else
            store.write(scope, key, value, initial, dirty, epoch);
    }, [store, scope, key, initial, dirty, epoch]);
    return [store === undefined ? local : store.read(scope, key, initial, dirty), set];
}
//# sourceMappingURL=drafts.js.map