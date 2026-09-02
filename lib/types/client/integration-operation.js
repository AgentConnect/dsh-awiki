/** Browser-side recovery for one Integration management mutation. */
const STORAGE_PREFIX = 'awiki_integration_operation_';
/** Generate a canonical UUIDv7 for one browser-initiated management mutation. */
export function integrationOperationId() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    let timestamp = Date.now();
    for (let index = 5; index >= 0; index -= 1) {
        bytes[index] = timestamp & 0xff;
        timestamp = Math.floor(timestamp / 256);
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x70;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function storage() {
    try {
        return globalThis.localStorage;
    }
    catch {
        return null;
    }
}
function key(kind) {
    return `${STORAGE_PREFIX}${kind}`;
}
export function durableIntegrationOperationId(kind, signature) {
    const target = storage();
    if (target === null)
        return integrationOperationId();
    try {
        const existing = JSON.parse(target.getItem(key(kind)) ?? 'null');
        if (existing?.signature === signature && typeof existing.id === 'string')
            return existing.id;
    }
    catch {
        target.removeItem(key(kind));
    }
    const id = integrationOperationId();
    target.setItem(key(kind), JSON.stringify({ signature, id }));
    return id;
}
export function clearIntegrationOperation(kind) {
    storage()?.removeItem(key(kind));
}
/** A definitive management read proves any earlier uncertain mutation can be retired. */
export function clearIntegrationOperations() {
    const target = storage();
    if (target === null)
        return;
    for (const kind of ['create', 'update', 'rotate', 'close', 'reopen'])
        target.removeItem(key(kind));
}
//# sourceMappingURL=integration-operation.js.map