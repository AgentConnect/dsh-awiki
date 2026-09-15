/** Validate the public target shape; Core alone validates conversation ownership and routing. */
export function isMessageTarget(value) {
    if (typeof value !== 'object' || value === null)
        return false;
    const target = value;
    const nonempty = (field) => typeof field === 'string' && field.trim() !== '';
    if (target.kind === 'direct') {
        if ('conversationId' in target)
            return !('peer' in target) && nonempty(target.conversationId);
        return nonempty(target.peer);
    }
    return target.kind === 'group' && nonempty(target.group);
}
//# sourceMappingURL=message-target.js.map