export async function syncAnpIdentityHandle(service, identity) {
    if (identity.handle === undefined)
        return;
    const client = await service.acquireClient({
        consumer: '@awiki/dsh-plugin',
        capabilities: ['identity:read', 'identity:handle'],
        ttlSeconds: 60,
    });
    try {
        const entry = (await client.list()).find(item => item.reference.did === identity.did);
        if (entry === undefined)
            throw new Error('Registered AWiki identity is absent from the ANP catalog');
        if (entry.handle !== identity.handle)
            await client.setHandle(entry.reference, identity.handle);
    }
    finally {
        await client.dispose();
    }
}
//# sourceMappingURL=identity-handle.js.map