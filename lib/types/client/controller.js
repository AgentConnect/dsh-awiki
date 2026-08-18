/** React-free browser controller for the deployment's one AWiki identity. */
/** Turn a registration rejection into an actionable message without exposing remote response text. */
function registrationFailureMessage(failure) {
    switch (failure.code) {
        case 'already-registered':
            return '当前设备已注册 AWiki 身份，请刷新后继续使用。';
        case 'invalid-request':
            return '注册信息不匹配，请检查手机号、Handle 和验证码后重试。';
        case 'invalid-otp':
            return '验证码不正确，请检查后重试。';
        case 'challenge-expired':
            return '验证码状态已失效，请重新获取验证码后再注册。';
        case 'handle-unavailable':
            return '该 Handle 已存在，无法重复注册。请更换一个未使用的 Handle，并重新获取验证码。';
        case 'conflict':
            return '注册冲突：服务端可能已收到上次注册请求，或该手机号 / Handle 已绑定其他身份。请保留当前页面并再次提交；若仍失败，请勿清除本机身份数据，联系管理员并提供失败时间。';
        case 'rate-limited':
            return '注册请求过于频繁，请稍后重试。';
        case 'network':
            return '无法连接 AWiki 服务，请检查网络后重试。';
        case 'forbidden':
            return '当前 AWiki 服务未开放公开注册，或该手机号不在注册白名单。请使用已获准的手机号，或联系管理员开通注册权限。';
        case 'remote':
            return 'AWiki 服务暂时无法完成注册，请稍后重试；若持续失败，请联系管理员并提供失败时间。';
        default:
            return `${failure.code}：${failure.message}`;
    }
}
/** Turn a verification-code request failure into a safe next action. */
function registrationOtpFailureMessage(failure) {
    switch (failure.code) {
        case 'rate-limited':
            return '验证码发送过于频繁，请等待限流解除后再重新获取。';
        case 'invalid-request':
            return '无法发送验证码，请检查手机号和 Handle 后重试。';
        case 'forbidden':
            return '当前 AWiki 服务未向该手机号开放注册，请联系管理员。';
        case 'network':
            return '无法连接 AWiki 服务，请检查网络后重试。';
        case 'remote':
            return 'AWiki 服务暂时无法发送验证码，请稍后重试。';
        default:
            return registrationFailureMessage(failure);
    }
}
const INITIAL_VIEW = Object.freeze({
    status: 'cold',
    sessionStatus: 'unregistered',
    identity: null,
    conversations: Object.freeze([]),
    conversationsHasMore: false,
    selectedConversationId: null,
    messages: Object.freeze([]),
    historyHasMore: false,
    localPending: false,
    refreshing: false,
    pending: null,
    error: null,
    attachmentMaxBytes: 0,
    summaries: Object.freeze({}),
});
/** Turn a closed Host summary failure into one actionable Chinese message. */
function summaryFailureMessage(failure) {
    switch (failure.code) {
        case 'summary-unavailable': return 'AI 总结暂不可用，请先在 Harness 设置中配置可用的默认模型。';
        case 'summary-timeout': return 'AI 总结超时，请稍后重新生成。';
        case 'summary-cancelled': return 'AI 总结已取消，请重新生成。';
        case 'summary-invalid-output': return '模型没有返回有效的结构化摘要，请重新生成。';
        case 'summary-failed': return '暂时无法生成 AI 总结，请检查模型连接后重试。';
        default: return `${failure.code}：${failure.message}`;
    }
}
/** Flatten the carrier and business result once for every controller caller. */
async function call(operation, failureMessage = failure => `${failure.code}：${failure.message}`) {
    try {
        const carried = await operation();
        if (!carried.ok)
            return { ok: false, error: `连接 AWiki Host 失败：${carried.error.message}` };
        if (!carried.value.ok) {
            return { ok: false, error: failureMessage(carried.value.error) };
        }
        return { ok: true, value: carried.value.value };
    }
    catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? `AWiki 调用失败：${error.message}` : 'AWiki 调用失败',
        };
    }
}
/** Append unique values while retaining existing references. */
function appendUnique(current, incoming, id) {
    const seen = new Set(current.map(id));
    const appended = [];
    for (const value of incoming) {
        const key = id(value);
        if (seen.has(key))
            continue;
        seen.add(key);
        appended.push(value);
    }
    return [...current, ...appended];
}
/** Keep one last-wins value per canonical id without changing the page's order. */
function canonicalMessagePage(incoming) {
    const byId = new Map();
    for (const message of incoming)
        byId.set(message.id, message);
    return [...byId.values()];
}
/** Replace the newest loaded window while preserving older messages before it. */
function mergeLatestMessages(current, incoming) {
    const page = canonicalMessagePage(incoming);
    const incomingIds = new Set(page.map(message => message.id));
    return [...current.filter(message => !incomingIds.has(message.id)), ...page];
}
/** Prepend one chronological continuation page while exact-updating any overlap. */
function mergeOlderMessages(current, incoming) {
    const page = canonicalMessagePage(incoming);
    const incomingIds = new Set(page.map(message => message.id));
    return [...page, ...current.filter(message => !incomingIds.has(message.id))];
}
/** Append a newly committed message, or enrich its existing canonical row in place. */
function appendMessageById(current, incoming) {
    const index = current.findIndex(message => message.id === incoming.id);
    if (index < 0)
        return [...current, incoming];
    return current.map((message, currentIndex) => currentIndex === index ? incoming : message);
}
/** Explain a background failure without implying that visible local messages were lost. */
function refreshFailureMessage(messages, error) {
    return messages.length > 0 ? `刷新失败，当前显示本地数据。${error}` : error;
}
/** Reject a page that attempts to cross the selected canonical conversation boundary. */
function pageBelongsToConversation(conversationId, messages) {
    return messages.every(message => message.conversationId === conversationId);
}
function timingStart() {
    return globalThis.performance?.now() ?? Date.now();
}
function clearConversationTimings() {
    const performance = globalThis.performance;
    if (performance === undefined)
        return;
    try {
        for (const name of [
            'conversation.select.local_timeline_ms',
            'conversation.select.first_paint_ms',
            'conversation.select.remote_history_ms',
        ])
            performance.clearMeasures(name);
    }
    catch {
        // Performance measurement is optional in restricted browser/test runtimes.
    }
}
/** Keep only one secret-free development measure for each selected-conversation phase. */
function recordTiming(name, startedAt, success) {
    const performance = globalThis.performance;
    if (performance === undefined)
        return;
    try {
        performance.clearMeasures(name);
        performance.measure(name, {
            start: startedAt,
            end: performance.now(),
            detail: { success, count: 1 },
        });
    }
    catch {
        // Performance measurement is optional in restricted browser/test runtimes.
    }
}
/** Strip surrounding space and a leading @ from a Handle the user typed. */
function normalizeHandle(value) {
    return value.trim().replace(/^@+/u, '');
}
/** Compare a typed Handle against the deployment identity, including domain suffix form. */
function sameIdentity(identity, peer) {
    const own = identity.handle.toLowerCase();
    const target = peer.toLowerCase();
    return own === target || own.startsWith(`${target}.`) || target.startsWith(`${own}.`);
}
/** Keys that can identify one direct peer in the current roster. */
function directPeerKeys(conversation) {
    const keys = [conversation.peerDid, conversation.title];
    if (conversation.peerHandle !== undefined)
        keys.push(conversation.peerHandle);
    if (conversation.displayName !== undefined)
        keys.push(conversation.displayName);
    return keys.map(value => value.replace(/^@/u, '').toLowerCase());
}
/** Find an existing direct conversation for one typed Handle or DID. */
function findDirect(conversations, peer) {
    const key = peer.toLowerCase();
    return conversations.find((conversation) => (conversation.kind === 'direct' && directPeerKeys(conversation).includes(key)));
}
/** Keep a profile refreshed from WNS when a slower roster page still carries an older message snapshot. */
function preserveDirectProfile(incoming, current) {
    if (incoming.kind !== 'direct' || current?.kind !== 'direct')
        return incoming;
    const displayName = current.displayName ?? incoming.displayName;
    const peerHandle = current.peerHandle ?? incoming.peerHandle;
    return {
        ...incoming,
        title: displayName ?? peerHandle ?? incoming.title,
        ...(peerHandle === undefined ? {} : { peerHandle }),
        ...(displayName === undefined ? {} : { displayName }),
    };
}
/** Resolve one listed conversation into the send target accepted by AWiki. */
function targetOf(conversation) {
    return conversation.kind === 'direct'
        ? { kind: 'direct', peer: conversation.peerDid }
        : { kind: 'group', group: conversation.groupDid };
}
/** Browser object layer for identity, conversations, history, and polling. */
export class AwikiController {
    remote;
    view = INITIAL_VIEW;
    listeners = new Set();
    config = null;
    conversationsCursor;
    historyCursor;
    timer;
    generation = 0;
    selectionRevision = 0;
    disposed = false;
    polling = false;
    markReadInFlight = new Map();
    unreadAtOpen = new Map();
    summaryBaselines = new Map();
    /** @param remote - generated Host Remote namespace. */
    constructor(remote) {
        this.remote = remote;
    }
    /** Return the cached immutable view. */
    getSnapshot = () => this.view;
    /** Subscribe to view replacement. */
    subscribe = (listener) => {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    };
    /**
     * Load Host policy and identity, then start polling while the drawer remains open.
     * @returns successful readiness or one display-safe Host failure.
     */
    async open() {
        if (this.disposed)
            return { ok: false, error: 'AWiki 插件已卸载' };
        this.close();
        this.summaryBaselines.clear();
        const generation = this.generation;
        this.publish({ ...INITIAL_VIEW, status: 'loading' });
        const config = await call(() => this.remote.getConfig());
        if (!this.current(generation))
            return { ok: true, value: undefined };
        if (!config.ok)
            return this.fail(config.error);
        this.config = config.value;
        const session = await call(() => this.remote.getSession());
        if (!this.current(generation))
            return { ok: true, value: undefined };
        if (!session.ok)
            return this.fail(session.error);
        const identity = session.value.status === 'active' ? session.value.identity : null;
        this.publish({
            ...this.view,
            status: 'ready',
            sessionStatus: session.value.status,
            identity,
            error: null,
            attachmentMaxBytes: config.value.attachmentMaxBytes,
        });
        if (identity !== null) {
            const listed = await this.refreshConversations(generation);
            if (!listed.ok)
                return listed;
        }
        if (this.current(generation)) {
            this.timer = setInterval(() => { void this.poll(generation); }, this.config.pollIntervalMs);
        }
        return { ok: true, value: undefined };
    }
    /** Sign out locally while retaining the SDK-owned identity and database. */
    async logout(request) {
        if (this.disposed)
            return { ok: false, error: 'AWiki 插件已卸载' };
        const result = await call(() => this.remote.logout(request));
        if (!result.ok)
            return result;
        this.close();
        this.conversationsCursor = undefined;
        this.historyCursor = undefined;
        this.summaryBaselines.clear();
        this.publish({
            ...INITIAL_VIEW,
            status: 'ready',
            sessionStatus: 'signed-out',
            attachmentMaxBytes: this.config?.attachmentMaxBytes ?? 0,
        });
        return result;
    }
    /** Resume the preserved local identity and reload its conversations. */
    async login() {
        if (this.disposed)
            return { ok: false, error: 'AWiki 插件已卸载' };
        const result = await call(() => this.remote.login());
        if (!result.ok)
            return result;
        if (result.value.status !== 'active')
            return { ok: false, error: '本机没有可恢复的 AWiki 身份' };
        const opened = await this.open();
        return opened.ok ? result : { ok: false, error: opened.error };
    }
    /** Stop polling and invalidate all in-flight drawer work. */
    close() {
        this.generation += 1;
        this.selectionRevision += 1;
        if (this.timer !== undefined)
            clearInterval(this.timer);
        this.timer = undefined;
        this.polling = false;
        this.markReadInFlight.clear();
    }
    /**
     * Request one phone verification challenge.
     * @param request - desired Handle and verification phone number.
     * @returns challenge retry metadata or one display-safe failure.
     */
    async sendRegistrationOtp(request) {
        return this.withPending('发送验证码', () => call(() => this.remote.sendRegistrationOtp(request), registrationOtpFailureMessage));
    }
    /**
     * Register the deployment identity and populate the initial conversation list.
     * @param request - verified Handle, phone number, and one-time code.
     * @returns the registered public identity or one display-safe failure.
     */
    async registerIdentity(request) {
        const generation = this.generation;
        const result = await this.withPending('注册身份', () => call(() => this.remote.registerIdentity(request), registrationFailureMessage));
        if (!result.ok)
            return result;
        if (!this.current(generation))
            return result;
        this.publish({ ...this.view, sessionStatus: 'active', identity: result.value, error: null });
        await this.refreshConversations(generation);
        return result;
    }
    /**
     * Update the deployment identity's public display name.
     * @param displayName - replacement display name selected by the user.
     * @returns the updated identity or one display-safe failure.
     */
    async updateDisplayName(displayName) {
        const normalized = displayName.trim();
        const length = Array.from(normalized).length;
        if (length === 0)
            return this.fail('请输入昵称');
        if (length > 50)
            return this.fail('昵称不能超过 50 个字符');
        const generation = this.generation;
        const result = await this.withPending('修改昵称', () => call(() => this.remote.updateDisplayName({ displayName: normalized })));
        if (!result.ok || !this.current(generation))
            return result;
        this.publish({ ...this.view, identity: result.value, error: null });
        return result;
    }
    /**
     * Load another page of the conversation roster.
     * @returns successful pagination or one display-safe failure.
     */
    async loadMoreConversations() {
        const generation = this.generation;
        const result = await this.withPending('加载更多会话', () => call(() => this.remote.listConversations(this.conversationsCursor === undefined ? {} : { cursor: this.conversationsCursor })));
        if (!result.ok)
            return result;
        if (!this.current(generation))
            return { ok: true, value: undefined };
        this.conversationsCursor = result.value.nextCursor;
        this.publish({
            ...this.view,
            conversations: appendUnique(this.view.conversations, result.value.items, value => value.id),
            conversationsHasMore: result.value.hasMore && result.value.nextCursor !== undefined,
        });
        return { ok: true, value: undefined };
    }
    /**
     * Look up a Handle or DID, then open the matching direct conversation.
     * @param handle - peer Handle or DID typed by the user.
     * @returns successful selection or one display-safe lookup failure.
     */
    async startDirectChat(handle) {
        if (this.disposed)
            return { ok: false, error: 'AWiki 插件已卸载' };
        const peer = normalizeHandle(handle);
        if (peer === '')
            return this.fail('请输入 Handle');
        const identity = this.view.identity;
        if (identity === null)
            return this.fail('请先注册 AWiki 身份');
        if (sameIdentity(identity, peer))
            return this.fail('不能向自己发起私聊');
        const existing = findDirect(this.view.conversations, peer);
        if (existing !== undefined)
            return this.selectConversation(existing.id);
        const generation = this.generation;
        const resolved = await this.withPending('查找用户', () => call(() => this.remote.resolvePeer({ peer })));
        if (!resolved.ok) {
            return resolved.error.startsWith('not-found') ? this.fail('该 Handle 不存在') : resolved;
        }
        if (!this.current(generation))
            return { ok: true, value: undefined };
        if (resolved.value.did === identity.did)
            return this.fail('不能向自己发起私聊');
        await this.refreshConversations(generation);
        if (!this.current(generation))
            return { ok: true, value: undefined };
        const listed = this.view.conversations.find(conversation => conversation.id === resolved.value.conversationId)
            ?? findDirect(this.view.conversations, resolved.value.handle ?? peer)
            ?? findDirect(this.view.conversations, resolved.value.did);
        if (listed !== undefined)
            return this.selectConversation(listed.id);
        const conversation = {
            kind: 'direct',
            id: resolved.value.conversationId,
            peerDid: resolved.value.did,
            title: resolved.value.displayName ?? resolved.value.handle ?? resolved.value.did,
            ...resolved.value.handle === undefined ? {} : { peerHandle: resolved.value.handle },
            ...resolved.value.displayName === undefined ? {} : { displayName: resolved.value.displayName },
        };
        this.publish({
            ...this.view,
            conversations: [conversation, ...this.view.conversations],
            error: null,
        });
        return this.selectConversation(conversation.id);
    }
    /**
     * Select a conversation and load its newest history page.
     * @param conversationId - selected conversation, or `null` to return to the roster.
     * @returns successful selection or one display-safe history failure.
     */
    async selectConversation(conversationId) {
        clearConversationTimings();
        const selectStartedAt = timingStart();
        const previousConversationId = this.view.selectedConversationId;
        const sameConversation = conversationId !== null && previousConversationId === conversationId;
        const selectionRevision = ++this.selectionRevision;
        this.historyCursor = undefined;
        const selected = conversationId === null
            ? undefined
            : this.view.conversations.find(conversation => conversation.id === conversationId);
        if (selected !== undefined)
            this.unreadAtOpen.set(selected.id, selected.unreadCount ?? 0);
        this.publish({
            ...this.view,
            selectedConversationId: conversationId,
            messages: sameConversation ? this.view.messages : [],
            historyHasMore: false,
            localPending: conversationId !== null,
            refreshing: false,
            error: null,
        });
        if (conversationId === null)
            return { ok: true, value: undefined };
        const generation = this.generation;
        const localStartedAt = timingStart();
        const local = await call(() => this.remote.getLocalHistory({ conversationId }));
        recordTiming('conversation.select.local_timeline_ms', localStartedAt, local.ok);
        if (!this.currentSelection(generation, selectionRevision, conversationId)) {
            return local.ok ? { ok: true, value: undefined } : local;
        }
        if (!local.ok) {
            this.publish({
                ...this.view,
                localPending: false,
                refreshing: true,
                error: local.error,
            });
            void this.reconcileSelectedConversation(conversationId, generation, selectionRevision);
            void this.refreshSelectedDirectProfile(selected, generation, selectionRevision);
            return local;
        }
        if (!pageBelongsToConversation(conversationId, local.value.items)) {
            return this.failSelectedConversation(generation, selectionRevision, conversationId, 'AWiki 本地消息归属不一致，请重新打开会话。');
        }
        this.publish({
            ...this.view,
            messages: mergeLatestMessages(this.view.messages, local.value.items),
            localPending: false,
            refreshing: true,
            error: null,
        });
        recordTiming('conversation.select.first_paint_ms', selectStartedAt, true);
        void this.reconcileSelectedConversation(conversationId, generation, selectionRevision);
        void this.refreshSelectedDirectProfile(selected, generation, selectionRevision);
        return { ok: true, value: undefined };
    }
    async reconcileSelectedConversation(conversationId, generation, selectionRevision) {
        const remoteStartedAt = timingStart();
        const remote = await call(() => this.remote.getHistory({ conversationId }));
        recordTiming('conversation.select.remote_history_ms', remoteStartedAt, remote.ok);
        if (!this.currentSelection(generation, selectionRevision, conversationId))
            return;
        if (!remote.ok) {
            this.publish({
                ...this.view,
                refreshing: false,
                error: refreshFailureMessage(this.view.messages, remote.error),
            });
            return;
        }
        if (!pageBelongsToConversation(conversationId, remote.value.items)) {
            this.failSelectedConversation(generation, selectionRevision, conversationId, 'AWiki 远端消息归属不一致，请重新打开会话。');
            return;
        }
        this.historyCursor = remote.value.nextCursor;
        const committed = await call(() => this.remote.getLocalHistory({ conversationId }));
        if (!this.currentSelection(generation, selectionRevision, conversationId))
            return;
        if (!committed.ok) {
            this.publish({
                ...this.view,
                refreshing: false,
                error: refreshFailureMessage(this.view.messages, committed.error),
            });
            return;
        }
        if (!pageBelongsToConversation(conversationId, committed.value.items)) {
            this.failSelectedConversation(generation, selectionRevision, conversationId, 'AWiki 本地消息归属不一致，请重新打开会话。');
            return;
        }
        const existingIds = new Set(this.view.messages.map(message => message.id));
        const incoming = committed.value.items.filter(message => !existingIds.has(message.id));
        this.publish({
            ...this.view,
            messages: mergeLatestMessages(this.view.messages, committed.value.items),
            historyHasMore: remote.value.hasMore && remote.value.nextCursor !== undefined,
            refreshing: false,
            error: null,
            summaries: this.staleSummaries(conversationId, incoming),
        });
    }
    async refreshSelectedDirectProfile(selected, generation, selectionRevision) {
        if (selected?.kind !== 'direct')
            return;
        const refreshed = await call(() => this.remote.resolvePeer({ peer: selected.peerDid }));
        if (!refreshed.ok
            || !this.currentSelection(generation, selectionRevision, selected.id)
            || refreshed.value.did !== selected.peerDid
            || refreshed.value.conversationId !== selected.id)
            return;
        this.publish({
            ...this.view,
            conversations: this.view.conversations.map((conversation) => {
                if (conversation.id !== selected.id || conversation.kind !== 'direct')
                    return conversation;
                const displayName = refreshed.value.displayName ?? conversation.displayName;
                const peerHandle = refreshed.value.handle ?? conversation.peerHandle;
                return {
                    ...conversation,
                    title: displayName ?? peerHandle ?? conversation.title,
                    ...(peerHandle === undefined ? {} : { peerHandle }),
                    ...(displayName === undefined ? {} : { displayName }),
                };
            }),
        });
    }
    failSelectedConversation(generation, selectionRevision, conversationId, error) {
        if (this.currentSelection(generation, selectionRevision, conversationId)) {
            this.publish({
                ...this.view,
                localPending: false,
                refreshing: false,
                error,
            });
        }
        return { ok: false, error };
    }
    /**
     * Mark the selected conversation read after the UI proves its newest message is visible.
     * Repeated scroll and layout notifications share one Host request, while a failed
     * background attempt keeps the unread badge so reaching the bottom can retry.
     */
    async markSelectedConversationRead() {
        if (this.disposed)
            return { ok: false, error: 'AWiki 插件已卸载' };
        const conversation = this.selectedConversation();
        if (conversation === undefined || (conversation.unreadCount ?? 0) <= 0) {
            return { ok: true, value: undefined };
        }
        const existing = this.markReadInFlight.get(conversation.id);
        if (existing !== undefined)
            return existing;
        const conversationId = conversation.id;
        const generation = this.generation;
        const operation = (async () => {
            const result = await call(() => this.remote.markConversationRead({ conversationId }));
            if (!result.ok)
                return result;
            if (this.current(generation)) {
                this.publish({
                    ...this.view,
                    conversations: this.view.conversations.map(current => current.id === conversationId
                        ? { ...current, unreadCount: 0 }
                        : current),
                });
            }
            return { ok: true, value: undefined };
        })();
        this.markReadInFlight.set(conversationId, operation);
        try {
            return await operation;
        }
        finally {
            if (this.markReadInFlight.get(conversationId) === operation) {
                this.markReadInFlight.delete(conversationId);
            }
        }
    }
    /**
     * Load one older history page before the currently rendered messages.
     * @returns successful pagination or one display-safe failure.
     */
    loadOlderHistory() {
        return this.loadHistory(true);
    }
    /** Generate or regenerate the selected conversation's runtime-only summary. */
    async summarizeConversation() {
        const conversation = this.selectedConversation();
        if (conversation === undefined)
            return this.fail('请先选择会话');
        const conversationId = conversation.id;
        const generation = this.generation;
        this.setSummary(conversationId, { status: 'loading', collapsed: false, stale: false });
        const unreadCountAtOpen = this.unreadAtOpen.get(conversationId) ?? 0;
        const result = await call(() => this.remote.summarizeConversation({
            conversationId,
            ...(unreadCountAtOpen > 0 ? { unreadCountAtOpen } : {}),
        }), summaryFailureMessage);
        if (!this.current(generation))
            return result;
        if (!result.ok) {
            this.setSummary(conversationId, {
                status: 'error',
                collapsed: false,
                stale: false,
                error: result.error,
            });
            return result;
        }
        this.setSummary(conversationId, {
            status: 'success',
            collapsed: false,
            stale: false,
            result: result.value,
        });
        const latestSentAt = Math.max(result.value.range.endedAt, ...this.view.messages.map(message => message.sentAt));
        const messageIdsAtLatest = new Set(this.view.messages
            .filter(message => message.sentAt === latestSentAt)
            .map(message => message.id));
        if (result.value.range.endedAt === latestSentAt)
            messageIdsAtLatest.add(result.value.range.lastMessageId);
        this.summaryBaselines.set(conversationId, { latestSentAt, messageIdsAtLatest });
        return result;
    }
    /** Expand or collapse one cached summary without another model call. */
    setSummaryCollapsed(conversationId, collapsed) {
        const current = this.view.summaries[conversationId];
        if (current === undefined || current.status === 'idle')
            return;
        this.setSummary(conversationId, { ...current, collapsed });
    }
    /**
     * Send one text message to the selected direct or group conversation.
     * @param text - non-empty text prepared by the composer.
     * @returns successful delivery or one display-safe failure.
     */
    async sendText(text) {
        const conversation = this.selectedConversation();
        if (conversation === undefined)
            return this.fail('请先选择会话');
        const conversationId = conversation.id;
        const generation = this.generation;
        const result = await this.withPending('发送消息', () => call(() => this.remote.sendText({
            target: targetOf(conversation), text, idempotencyKey: crypto.randomUUID(),
        })));
        if (!result.ok)
            return result;
        if (!this.current(generation) || this.view.selectedConversationId !== conversationId) {
            return { ok: true, value: undefined };
        }
        this.appendMessage(result.value);
        return { ok: true, value: undefined };
    }
    /**
     * Send one already-read browser file without retaining its bytes in the view.
     * @param file - JSON-safe file name, MIME type, base64 bytes, and optional caption.
     * @returns successful delivery or one display-safe failure.
     */
    async sendAttachment(file) {
        const conversation = this.selectedConversation();
        if (conversation === undefined)
            return this.fail('请先选择会话');
        const conversationId = conversation.id;
        const generation = this.generation;
        const request = {
            target: targetOf(conversation),
            fileName: file.fileName,
            mimeType: file.mimeType,
            bytesBase64: file.bytesBase64,
            ...(file.caption === undefined ? {} : { caption: file.caption }),
            idempotencyKey: crypto.randomUUID(),
        };
        const result = await this.withPending('发送附件', () => call(() => this.remote.sendAttachment(request)));
        if (!result.ok)
            return result;
        if (!this.current(generation) || this.view.selectedConversationId !== conversationId) {
            return { ok: true, value: undefined };
        }
        this.appendMessage(result.value);
        return { ok: true, value: undefined };
    }
    /**
     * Download verified attachment bytes without publishing them into controller state.
     * @param messageId - message that grants access to the attachment.
     * @param attachmentId - attachment selected from that message.
     * @returns verified attachment metadata and bytes, or one display-safe failure.
     */
    async downloadAttachment(messageId, attachmentId) {
        if (this.disposed)
            return { ok: false, error: 'AWiki 插件已卸载' };
        const generation = this.generation;
        const result = await call(() => this.remote.downloadAttachment({ attachmentId, messageId }));
        return this.current(generation) ? result : { ok: false, error: 'AWiki 已关闭' };
    }
    /** Clear Host-owned local data and immediately remove every cached browser projection. */
    async clearLocalData(request) {
        if (this.disposed)
            return { ok: false, error: 'AWiki 插件已卸载' };
        const result = await call(() => this.remote.clearLocalData(request));
        if (!result.ok)
            return result;
        this.close();
        this.config = null;
        this.conversationsCursor = undefined;
        this.historyCursor = undefined;
        this.unreadAtOpen.clear();
        this.summaryBaselines.clear();
        this.publish({ ...INITIAL_VIEW, status: 'ready' });
        return result;
    }
    /** Stop timers, invalidate work, and drop subscribers during HMR unload. */
    dispose() {
        this.disposed = true;
        this.close();
        this.listeners.clear();
    }
    async refreshConversations(generation) {
        const result = await call(() => this.remote.listConversations({}));
        if (!this.current(generation))
            return { ok: true, value: undefined };
        if (!result.ok)
            return this.fail(result.error);
        const firstPage = this.view.conversations.length === 0;
        if (firstPage)
            this.conversationsCursor = result.value.nextCursor;
        const refreshed = result.value.items.map(incoming => preserveDirectProfile(incoming, this.view.conversations.find(current => current.id === incoming.id)));
        this.publish({
            ...this.view,
            conversations: firstPage
                ? refreshed
                : appendUnique(refreshed, this.view.conversations, value => value.id),
            conversationsHasMore: firstPage
                ? result.value.hasMore && result.value.nextCursor !== undefined
                : this.view.conversationsHasMore,
            error: null,
        });
        return { ok: true, value: undefined };
    }
    async loadHistory(older) {
        const conversationId = this.view.selectedConversationId;
        if (conversationId === null)
            return this.fail('请先选择会话');
        const generation = this.generation;
        const request = {
            conversationId,
            ...(older && this.historyCursor !== undefined ? { cursor: this.historyCursor } : {}),
        };
        const result = await this.withPending(older ? '加载更早消息' : '加载消息', () => call(() => this.remote.getHistory(request)));
        if (!result.ok)
            return result;
        if (!this.current(generation))
            return { ok: true, value: undefined };
        if (this.view.selectedConversationId !== conversationId)
            return { ok: true, value: undefined };
        if (!pageBelongsToConversation(conversationId, result.value.items)) {
            return this.fail('AWiki 远端消息归属不一致，请重新打开会话。');
        }
        this.historyCursor = result.value.nextCursor;
        const messages = older
            ? mergeOlderMessages(this.view.messages, result.value.items)
            : mergeLatestMessages(this.view.messages, result.value.items);
        this.publish({
            ...this.view,
            // SDK pages are chronological. A continuation page contains older
            // messages, so it is prepended to the already rendered chronological tail.
            messages,
            historyHasMore: result.value.hasMore && result.value.nextCursor !== undefined,
            summaries: older ? this.view.summaries : this.staleSummaries(conversationId, result.value.items),
        });
        return { ok: true, value: undefined };
    }
    async poll(generation) {
        if (this.polling || !this.current(generation) || this.view.identity === null)
            return;
        this.polling = true;
        try {
            await this.refreshConversations(generation);
            const selected = this.view.selectedConversationId;
            if (selected === null || !this.current(generation))
                return;
            const result = await call(() => this.remote.getHistory({ conversationId: selected }));
            if (!this.current(generation) || !result.ok || this.view.selectedConversationId !== selected)
                return;
            if (!pageBelongsToConversation(selected, result.value.items)) {
                this.publish({ ...this.view, error: 'AWiki 远端消息归属不一致，请重新打开会话。' });
                return;
            }
            const existingIds = new Set(this.view.messages.map(message => message.id));
            const incoming = result.value.items.filter(message => !existingIds.has(message.id));
            const messages = mergeLatestMessages(this.view.messages, result.value.items);
            const added = messages.length - this.view.messages.length;
            if (added > 0 && (this.unreadAtOpen.get(selected) ?? 0) > 0) {
                this.unreadAtOpen.set(selected, (this.unreadAtOpen.get(selected) ?? 0) + added);
            }
            this.publish({
                ...this.view,
                messages,
                summaries: this.staleSummaries(selected, incoming),
            });
        }
        finally {
            this.polling = false;
        }
    }
    async withPending(label, operation) {
        if (this.disposed)
            return { ok: false, error: 'AWiki 插件已卸载' };
        const generation = this.generation;
        this.publish({ ...this.view, pending: label, error: null });
        const result = await operation();
        if (!this.current(generation))
            return result;
        this.publish({ ...this.view, pending: null, error: result.ok ? null : result.error });
        return result;
    }
    appendMessage(message) {
        if (this.view.selectedConversationId !== message.conversationId)
            return;
        const isNew = !this.view.messages.some(current => current.id === message.id);
        const messages = appendMessageById(this.view.messages, message);
        if ((this.unreadAtOpen.get(message.conversationId) ?? 0) > 0 && messages.length > this.view.messages.length) {
            this.unreadAtOpen.set(message.conversationId, (this.unreadAtOpen.get(message.conversationId) ?? 0) + 1);
        }
        this.publish({
            ...this.view,
            messages,
            summaries: isNew ? this.markSummaryStale(message.conversationId) : this.view.summaries,
            error: null,
        });
    }
    setSummary(conversationId, summary) {
        this.publish({
            ...this.view,
            summaries: Object.freeze({ ...this.view.summaries, [conversationId]: Object.freeze(summary) }),
        });
    }
    staleSummaries(conversationId, messages) {
        const summary = this.view.summaries[conversationId];
        if (summary?.status !== 'success' || summary.result === undefined || summary.stale)
            return this.view.summaries;
        const baseline = this.summaryBaselines.get(conversationId) ?? {
            latestSentAt: summary.result.range.endedAt,
            messageIdsAtLatest: new Set([summary.result.range.lastMessageId]),
        };
        const hasNewMessage = messages.some(message => (message.sentAt > baseline.latestSentAt
            || (message.sentAt === baseline.latestSentAt && !baseline.messageIdsAtLatest.has(message.id))));
        if (!hasNewMessage)
            return this.view.summaries;
        return this.markSummaryStale(conversationId);
    }
    markSummaryStale(conversationId) {
        const summary = this.view.summaries[conversationId];
        if (summary?.status !== 'success' || summary.stale)
            return this.view.summaries;
        return Object.freeze({
            ...this.view.summaries,
            [conversationId]: Object.freeze({ ...summary, stale: true }),
        });
    }
    selectedConversation() {
        const selected = this.view.selectedConversationId;
        return selected === null ? undefined : this.view.conversations.find(value => value.id === selected);
    }
    fail(error) {
        this.publish({ ...this.view, status: this.view.status === 'loading' ? 'error' : this.view.status, pending: null, error });
        return { ok: false, error };
    }
    current(generation) {
        return !this.disposed && generation === this.generation;
    }
    currentSelection(generation, selectionRevision, conversationId) {
        return this.current(generation)
            && selectionRevision === this.selectionRevision
            && this.view.selectedConversationId === conversationId;
    }
    publish(view) {
        /* v8 ignore next -- every asynchronous and public mutation path checks disposal before publishing. */
        if (this.disposed)
            return;
        this.view = Object.freeze(view);
        for (const listener of [...this.listeners])
            listener();
    }
}
//# sourceMappingURL=controller.js.map