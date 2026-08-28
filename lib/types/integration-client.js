/** Host-only fixed-scope client for Guest Integration management. */
const MAX_REQUEST_BYTES = 64 * 1024;
const MAX_RESPONSE_BYTES = 1024 * 1024;
const REQUEST_TIMEOUT_MS = 10_000;
const INTEGRATION_STATUSES = ['active', 'closed'];
const TARGET_AVAILABILITIES = [
    'eligible',
    'group_not_found',
    'owner_not_active',
    'owner_mismatch',
    'not_open_join',
    'unsupported_security_profile',
    'member_send_disabled',
    'attachments_disabled',
    'group_full',
    'validation_unavailable',
];
const OPERATIONS = {
    read: { method: 'GET', path: '/guest/api/v1/management/integration' },
    create: { method: 'POST', path: '/guest/api/v1/management/integration' },
    update: { method: 'PATCH', path: '/guest/api/v1/management/integration' },
    rotate: { method: 'POST', path: '/guest/api/v1/management/integration/rotate-id' },
    close: { method: 'POST', path: '/guest/api/v1/management/integration/close' },
};
/** Browser-safe management input translated to the Gateway's snake-case contract. */
function fields(request) {
    return {
        product_name: request.productName,
        description: request.description,
        contact_enabled: request.contactEnabled,
        contact_description: request.contactDescription,
        group_targets: request.groupTargets.map(target => ({
            ...target.id === undefined ? {} : { id: target.id },
            group_did: target.groupDid,
            description: target.description,
        })),
    };
}
function view(raw) {
    if (typeof raw !== 'object' || raw === null)
        throw new TypeError('invalid Integration response');
    const value = raw;
    const owner = value.owner;
    const groups = value.group_targets;
    if (typeof owner !== 'object' || owner === null || !Array.isArray(groups)) {
        throw new TypeError('invalid Integration response');
    }
    return {
        id: requiredString(value.id),
        publicId: nullableString(value.public_id),
        integrationUrl: nullableString(value.integration_url),
        owner: {
            tenantId: requiredString(owner.tenant_id),
            handle: requiredString(owner.handle),
            currentDid: requiredString(owner.current_did),
            displayName: requiredString(owner.display_name),
        },
        productName: requiredString(value.product_name),
        description: requiredString(value.description),
        contactEnabled: requiredBoolean(value.contact_enabled),
        contactDescription: requiredString(value.contact_description),
        groupTargets: groups.map(group => {
            if (typeof group !== 'object' || group === null)
                throw new TypeError('invalid Integration group');
            const target = group;
            return {
                id: requiredString(target.id),
                groupDid: requiredString(target.group_did),
                displayName: requiredString(target.display_name),
                avatarUrl: nullableString(target.avatar_url),
                description: requiredString(target.description),
                availability: requiredEnum(target.availability, TARGET_AVAILABILITIES),
            };
        }),
        status: requiredEnum(value.status, INTEGRATION_STATUSES),
        revision: requiredInteger(value.revision),
    };
}
function requiredString(value) {
    if (typeof value !== 'string')
        throw new TypeError('invalid Integration response');
    return value;
}
function nullableString(value) {
    if (value === null)
        return null;
    return requiredString(value);
}
function requiredBoolean(value) {
    if (typeof value !== 'boolean')
        throw new TypeError('invalid Integration response');
    return value;
}
function requiredInteger(value) {
    if (!Number.isSafeInteger(value))
        throw new TypeError('invalid Integration response');
    return value;
}
function requiredEnum(value, allowed) {
    if (typeof value !== 'string' || !allowed.includes(value)) {
        throw new TypeError('invalid Integration response');
    }
    return value;
}
function failure(status, raw) {
    const body = typeof raw === 'object' && raw !== null ? raw : {};
    const nested = typeof body.error === 'object' && body.error !== null
        ? body.error
        : body;
    const candidate = typeof nested.code === 'string' ? nested.code : '';
    const code = status === 404 ? 'not-found'
        : status === 409 ? 'conflict'
            : status === 400 ? 'invalid-request'
                : status === 401 ? 'unauthorized'
                    : status === 403 ? 'forbidden'
                        : status === 429 ? 'rate-limited'
                            : status >= 500 ? 'unavailable'
                                : ['not-found', 'conflict', 'invalid-request', 'forbidden', 'unauthorized', 'rate-limited', 'unavailable'].includes(candidate)
                                    ? candidate
                                    : 'remote';
    return { code, message: integrationFailureMessage(code) };
}
function integrationFailureMessage(code) {
    switch (code) {
        case 'not-found': return '尚未创建 Integration。';
        case 'conflict': return 'Integration 已在其他位置更新，请重新加载后再试。';
        case 'invalid-request': return 'Integration 信息不完整或格式不正确。';
        case 'forbidden': return '当前 AWiki 身份无权管理这个 Integration。';
        case 'unauthorized': return '请先在 AWiki 正式版中登录。';
        case 'rate-limited': return '操作过于频繁，请稍后重试。';
        case 'unavailable': return '临时消息服务暂时不可用。';
        case 'network': return '无法连接临时消息服务。';
        default: return '临时消息服务返回了无法识别的结果。';
    }
}
async function readBounded(response) {
    const reader = response.body?.getReader();
    if (reader === undefined)
        return null;
    const chunks = [];
    let size = 0;
    try {
        while (true) {
            const result = await reader.read();
            if (result.done)
                break;
            size += result.value.byteLength;
            if (size > MAX_RESPONSE_BYTES)
                throw new TypeError('Integration response too large');
            chunks.push(result.value);
        }
    }
    finally {
        reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }
    if (bytes.length === 0)
        return null;
    return JSON.parse(new TextDecoder().decode(bytes));
}
/** Fixed-origin client; callers cannot control path, method, headers, or transport. */
export class AwikiIntegrationClient {
    origin;
    auth;
    constructor(origin, auth) {
        this.origin = origin;
        this.auth = auth;
    }
    read() {
        return this.execute('read');
    }
    create(request) {
        return this.execute('create', fields(request), request.idempotencyKey);
    }
    update(request) {
        return this.execute('update', { expected_revision: request.expectedRevision, ...fields(request) }, request.idempotencyKey);
    }
    rotate(request) {
        return this.execute('rotate', { expected_revision: request.expectedRevision }, request.idempotencyKey);
    }
    close(request) {
        return this.execute('close', { expected_revision: request.expectedRevision }, request.idempotencyKey);
    }
    async execute(operation, body, idempotencyKey) {
        const spec = OPERATIONS[operation];
        const encoded = body === undefined ? undefined : JSON.stringify(body);
        if (encoded !== undefined && Buffer.byteLength(encoded, 'utf8') > MAX_REQUEST_BYTES) {
            return { ok: false, error: { code: 'invalid-request', message: integrationFailureMessage('invalid-request') } };
        }
        const headers = new Headers({ accept: 'application/json' });
        if (encoded !== undefined)
            headers.set('content-type', 'application/json');
        if (idempotencyKey !== undefined)
            headers.set('idempotency-key', idempotencyKey);
        const abort = new AbortController();
        const timeout = setTimeout(() => { abort.abort(); }, REQUEST_TIMEOUT_MS);
        try {
            const request = new Request(new URL(spec.path, this.origin), {
                method: spec.method,
                headers,
                ...encoded === undefined ? {} : { body: encoded },
                redirect: 'error',
                signal: abort.signal,
            });
            const response = await this.auth.dispatch(request, signed => fetch(signed));
            const raw = await readBounded(response);
            if (!response.ok)
                return { ok: false, error: failure(response.status, raw) };
            return { ok: true, value: view(raw) };
        }
        catch {
            return { ok: false, error: { code: 'network', message: integrationFailureMessage('network') } };
        }
        finally {
            clearTimeout(timeout);
        }
    }
}
//# sourceMappingURL=integration-client.js.map