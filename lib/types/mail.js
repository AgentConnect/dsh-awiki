/** Host-owned validation for on-demand mail requests. */
const U32_MAX = 0xffff_ffff;
const MAX_MESSAGE_IDS = 100;
const MAX_RECIPIENTS = 20;
function reject() {
    throw new TypeError('invalid AWiki mail request');
}
function token(value, maxCharacters) {
    if (typeof value !== 'string'
        || value.length === 0
        || value.trim() !== value
        || Array.from(value).length > maxCharacters
        || /[\u0000-\u001f\u007f-\u009f]/u.test(value))
        reject();
    return value;
}
function address(value) {
    if (typeof value !== 'string')
        reject();
    const length = Array.from(value).length;
    if (length < 3
        || length > 320
        || !value.includes('@')
        || /[\s\u0000-\u001f\u007f-\u009f]/u.test(value))
        reject();
    return value;
}
/** Resolve mailbox defaults before the provider is invoked. */
export function mailInboxRequest(request = {}) {
    const folder = token(request.folder ?? 'inbox', 64);
    const limit = request.limit ?? 20;
    const offset = request.offset ?? 0;
    const unreadOnly = request.unreadOnly ?? false;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)
        reject();
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > U32_MAX)
        reject();
    if (typeof unreadOnly !== 'boolean')
        reject();
    return { folder, unreadOnly, limit, offset };
}
export function mailReadRequest(request) {
    return { messageId: token(request.messageId, 2_048) };
}
export function mailMarkReadRequest(request) {
    if (!Array.isArray(request.messageIds)
        || request.messageIds.length === 0
        || request.messageIds.length > MAX_MESSAGE_IDS)
        reject();
    return {
        messageIds: request.messageIds.map(value => token(value, 2_048)),
    };
}
export function mailSendRequest(request) {
    if (!Array.isArray(request.to) || request.to.length === 0 || !Array.isArray(request.cc ?? []))
        reject();
    const to = request.to.map(address);
    const cc = (request.cc ?? []).map(address);
    if (to.length + cc.length > MAX_RECIPIENTS)
        reject();
    const recipients = new Set([...to, ...cc]);
    if (recipients.size !== to.length + cc.length)
        reject();
    if (typeof request.subject !== 'string'
        || request.subject.length === 0
        || request.subject.trim() !== request.subject
        || Buffer.byteLength(request.subject, 'utf8') > 1_024)
        reject();
    if (typeof request.bodyText !== 'string'
        || request.bodyText.trim().length === 0
        || Buffer.byteLength(request.bodyText, 'utf8') > 65_536)
        reject();
    return { to, cc, subject: request.subject, bodyText: request.bodyText };
}
//# sourceMappingURL=mail.js.map