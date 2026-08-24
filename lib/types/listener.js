import { createHash, randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { installModelSelection } from '@deepseek-ai/dsh-agent';
import { createUserMessage } from '@deepseek-ai/dsh-llm';
import { SessionId } from '@deepseek-ai/dsh-session';
import { AwikiListenerStateStore, } from "./listener-state.js";
const HISTORY_PAGE_LIMIT = 100;
const MAX_HISTORY_PAGES = 20;
const CONVERSATION_PAGE_LIMIT = 100;
const MAX_CONVERSATION_PAGES = 20;
const MAX_REPLY_CHARACTERS = 4_000;
const LISTENER_SOURCE = '@awiki/dsh-plugin/listener';
const HELP_TEXT = [
    '可用命令：',
    '/new - 结束当前映射，下一条消息创建新的 DSH 会话',
    '/new <消息> - 在新的 DSH 会话中立即发送消息',
    '/status - 查看当前 DSH 会话',
    '/help - 查看命令帮助',
].join('\n');
const RESET_TEXT = '已重置。下一条普通消息将创建新的 DSH 会话。';
const NO_SESSION_TEXT = '当前还没有 DSH 会话。发送普通消息即可创建。';
const AGENT_FAILURE_TEXT = '本次 DSH 会话未能生成文本回复，请稍后重试。';
const UNKNOWN_COMMAND_TEXT = '无法识别该命令。发送 /help 查看可用命令。';
function textFromAssistant(message) {
    return message.data.message.content
        .filter((block) => block.type === 'text')
        .map(block => block.text)
        .join('');
}
/** Fold only the turn that claimed one exact submitted message. */
export function finalAssistantText(events, messageId) {
    const userIndex = events.findIndex(event => event.type === 'user/message' && event.data.id === messageId);
    if (userIndex < 0)
        return undefined;
    let turn;
    for (let index = userIndex; index >= 0; index -= 1) {
        const event = events[index];
        if (event?.type === 'turn/start') {
            turn = event.data.turn;
            break;
        }
    }
    if (turn === undefined)
        return undefined;
    let output = '';
    let ended = false;
    for (let index = userIndex + 1; index < events.length; index += 1) {
        const event = events[index];
        if (event?.type === 'assistant/message' && event.data.turn === turn) {
            const text = textFromAssistant(event);
            if (text !== '')
                output = text;
        }
        if (event?.type === 'turn/end' && event.data.turn === turn) {
            ended = true;
            break;
        }
    }
    return ended && output.trim().length > 0 ? output.trim() : undefined;
}
/** Production adapter around the registered Workspace and official Agent lifecycle. */
export class DshAwikiListenerAgentRuntime {
    ctx;
    workspacePath;
    handles = new Map();
    workspace;
    constructor(ctx, workspacePath) {
        this.ctx = ctx;
        this.workspacePath = workspacePath;
    }
    async open(existingSessionId) {
        const workspace = await this.resolveWorkspace();
        const selection = this.currentSelection();
        const sessionId = existingSessionId ?? `session-${randomUUID()}`;
        const id = SessionId(sessionId);
        let agent = this.ctx.agents.get(id);
        let openedHandle;
        if (agent === undefined) {
            const setup = (agentCtx) => {
                installModelSelection(agentCtx, { current: selection, assembled: undefined });
            };
            const handle = existingSessionId === undefined
                ? await this.ctx.agents.create({
                    sessionId: id,
                    meta: { cwd: workspace.path },
                    agentOptions: { provider: selection.provider, model: selection.model },
                    setup,
                })
                : await this.ctx.agents.resume({
                    resumeSessionId: id,
                    agentOptions: { provider: selection.provider, model: selection.model },
                    setup,
                });
            openedHandle = handle;
            this.handles.set(sessionId, handle);
            agent = handle.agent;
        }
        try {
            await workspace.attachSession(id);
        }
        catch (error) {
            if (openedHandle !== undefined) {
                if (this.handles.get(sessionId) === openedHandle)
                    this.handles.delete(sessionId);
                try {
                    await openedHandle.dispose();
                }
                catch (disposeError) {
                    throw new AggregateError([error, disposeError], 'awiki listener: failed to attach and dispose Agent session');
                }
            }
            throw error;
        }
        return {
            sessionId,
            prompt: text => this.prompt(agent, text),
        };
    }
    async reset(sessionId) {
        if (sessionId === undefined)
            return;
        const handle = this.handles.get(sessionId);
        if (handle === undefined)
            return;
        this.handles.delete(sessionId);
        await handle.dispose();
    }
    async dispose() {
        const handles = [...this.handles.values()];
        this.handles.clear();
        const results = await Promise.allSettled(handles.map(handle => handle.dispose()));
        const rejected = results.find((result) => result.status === 'rejected');
        if (rejected !== undefined)
            throw rejected.reason;
    }
    resolveWorkspace() {
        this.workspace ??= (async () => {
            await mkdir(this.workspacePath, { recursive: true });
            return await this.ctx.workspaceRegistry.resolveByPath(this.workspacePath)
                ?? await this.ctx.workspaceRegistry.create(this.workspacePath, 'AWiki');
        })();
        return this.workspace;
    }
    currentSelection() {
        const defaults = this.ctx.get('agentDefaultModel');
        if (defaults === undefined)
            throw new Error('awiki listener: default Agent model is unavailable');
        return defaults.currentSelection();
    }
    async prompt(agent, text) {
        await agent.whenIdle();
        const firstSeq = agent.session.seq;
        const message = createUserMessage({
            content: [{ type: 'text', text }],
            source: { kind: 'plugin', plugin: LISTENER_SOURCE, form: 'relay' },
        });
        agent.followup(message);
        await agent.whenIdle();
        await this.ctx.sessions.flush(agent.session);
        const output = finalAssistantText(agent.session.events.slice(firstSeq), message.id);
        if (output === undefined)
            throw new Error('awiki listener: Agent produced no completed text response');
        return output;
    }
}
function command(text) {
    const trimmed = text.trim();
    if (!trimmed.startsWith('/'))
        return undefined;
    const separator = trimmed.search(/\s/u);
    const name = (separator < 0 ? trimmed : trimmed.slice(0, separator)).toLowerCase();
    return { name, argument: separator < 0 ? '' : trimmed.slice(separator).trim() };
}
function chunks(text) {
    const characters = Array.from(text);
    const result = [];
    for (let offset = 0; offset < characters.length; offset += MAX_REPLY_CHARACTERS) {
        result.push(characters.slice(offset, offset + MAX_REPLY_CHARACTERS).join(''));
    }
    return result.length === 0 ? [AGENT_FAILURE_TEXT] : result;
}
function replyKey(messageId, index) {
    const digest = createHash('sha256').update(messageId).digest('hex');
    return `awiki-listener-${digest}-${index}`;
}
function allowedConversation(conversation, allowedPeers) {
    if (conversation.kind !== 'direct')
        return false;
    if (allowedPeers.has(conversation.peerDid))
        return true;
    return conversation.peerHandle !== undefined && allowedPeers.has(conversation.peerHandle.toLowerCase());
}
function incomingFromPeer(message, conversation) {
    return message.conversationId === conversation.id
        && message.conversationKind === 'direct'
        && !message.outgoing
        && message.senderDid === conversation.peerDid;
}
function copyState(state) {
    return {
        version: 2,
        identityScopeHash: state.identityScopeHash,
        conversations: Object.fromEntries(Object.entries(state.conversations).map(([id, route]) => [id, { ...route }])),
    };
}
/** Consume authorized Direct text only after the identity supervisor commits synchronization. */
export class AwikiAgentListener {
    awiki;
    agents;
    config;
    allowedPeers;
    store;
    logger;
    stateReady;
    state;
    stateMutation = Promise.resolve();
    syncMutation = Promise.resolve();
    scheduledMessageIds = new Set();
    conversationQueues = new Map();
    stopped = false;
    constructor(awiki, agents, config, logger, store) {
        this.awiki = awiki;
        this.agents = agents;
        this.config = config;
        this.allowedPeers = new Set(config.allowedPeers.map(peer => peer.startsWith('did:') ? peer : peer.toLowerCase()));
        this.store = store ?? new AwikiListenerStateStore(config.stateRoot, config.identityScope);
        this.state = { version: 2, identityScopeHash: this.store.identityScopeHash, conversations: {} };
        this.logger = logger ?? {
            debug() { }, info() { }, warn() { }, error() { }, name: 'awiki-listener',
        };
        this.stateReady = this.store.load().then((state) => { this.state = state; });
    }
    /** Reconcile only committed history; this consumer cannot start WSS or advance sync. */
    async reconcileOnce() {
        await this.enqueueSync(async () => {
            await this.stateReady;
            if (this.stopped)
                return;
            await this.reconcileCommittedHistory();
        });
    }
    /** Wait until every message currently queued for a test or orderly shutdown settles. */
    async whenIdle() {
        await this.syncMutation;
        while (this.conversationQueues.size > 0) {
            await Promise.allSettled([...this.conversationQueues.values()]);
        }
        await this.stateMutation;
    }
    /** Fence late work, drain committed messages, then release listener-owned Agents. */
    async dispose() {
        if (this.stopped)
            return;
        this.stopped = true;
        await this.whenIdle();
        await this.agents.dispose();
    }
    enqueueSync(operation) {
        const pending = this.syncMutation.then(operation, operation);
        this.syncMutation = pending.catch(() => undefined);
        return pending;
    }
    async reconcileCommittedHistory() {
        const conversations = await this.listConversations();
        await Promise.all(conversations
            .filter(conversation => allowedConversation(conversation, this.allowedPeers))
            .map(async (conversation) => {
            const messages = await this.unseenMessages(conversation);
            for (const message of messages)
                this.enqueue(conversation, message);
        }));
    }
    async listConversations() {
        const conversations = [];
        let cursor;
        for (let page = 0; page < MAX_CONVERSATION_PAGES; page += 1) {
            const result = await this.awiki.listConversations({
                limit: CONVERSATION_PAGE_LIMIT,
                ...(cursor === undefined ? {} : { cursor: cursor }),
            });
            conversations.push(...result.items);
            if (!result.hasMore || result.nextCursor === undefined)
                break;
            cursor = String(result.nextCursor);
        }
        return conversations;
    }
    async unseenMessages(conversation) {
        await this.stateMutation;
        const route = this.state.conversations[conversation.id];
        if (route !== undefined && route.peerDid !== conversation.peerDid) {
            this.logger.warn('AWiki listener refused a conversation whose peer DID changed');
            return [];
        }
        const watermark = route?.lastProcessedMessageId;
        const unread = conversation.unreadCount;
        if (watermark === undefined && unread === 0)
            return [];
        let cursor;
        let history = [];
        for (let page = 0; page < MAX_HISTORY_PAGES; page += 1) {
            const result = await this.awiki.getHistory({
                conversationId: conversation.id,
                limit: HISTORY_PAGE_LIMIT,
                ...(cursor === undefined ? {} : { cursor: cursor }),
            });
            history = [...result.items, ...history];
            if (watermark !== undefined
                && history.some(message => message.id === watermark && incomingFromPeer(message, conversation)))
                break;
            const incoming = history.filter(message => incomingFromPeer(message, conversation));
            if (watermark === undefined && new Set(incoming.map(message => message.id)).size >= unread)
                break;
            if (!result.hasMore || result.nextCursor === undefined)
                break;
            cursor = String(result.nextCursor);
        }
        const watermarkIndex = watermark === undefined
            ? -1
            : history.findLastIndex(message => message.id === watermark && incomingFromPeer(message, conversation));
        const incomingIds = new Set();
        const incoming = history.filter((message) => {
            if (!incomingFromPeer(message, conversation) || incomingIds.has(message.id))
                return false;
            incomingIds.add(message.id);
            return true;
        });
        const boundaryFound = watermark === undefined ? incoming.length >= unread : watermarkIndex >= 0;
        if (!boundaryFound) {
            this.logger.warn('AWiki listener stopped reconciliation at the bounded history boundary');
            return [];
        }
        let candidates = watermarkIndex >= 0
            ? history.slice(watermarkIndex + 1)
            : incoming.slice(-unread);
        candidates = candidates.filter(message => message.id !== watermark && incomingFromPeer(message, conversation));
        const seen = new Set();
        return candidates.filter((message) => {
            if (seen.has(message.id))
                return false;
            seen.add(message.id);
            return true;
        });
    }
    enqueue(conversation, message) {
        if (this.scheduledMessageIds.has(message.id))
            return;
        this.scheduledMessageIds.add(message.id);
        const previous = this.conversationQueues.get(conversation.id) ?? Promise.resolve();
        const queued = previous
            .then(async () => {
            try {
                await this.process(conversation, message);
            }
            catch (error) {
                this.logger.warn('AWiki listener message failed: %s', error instanceof Error ? error.message : 'unknown failure');
                throw error;
            }
        })
            .finally(() => {
            this.scheduledMessageIds.delete(message.id);
            if (this.conversationQueues.get(conversation.id) === queued) {
                this.conversationQueues.delete(conversation.id);
            }
        });
        this.conversationQueues.set(conversation.id, queued);
        void queued.catch(() => undefined);
    }
    async process(conversation, message) {
        if (this.stopped)
            return;
        await this.stateMutation;
        const route = this.state.conversations[conversation.id];
        if (route?.lastProcessedMessageId === message.id)
            return;
        if (message.content.kind !== 'text') {
            await this.commit(conversation, message.id, route?.sessionId);
            return;
        }
        const parsed = command(message.content.text);
        if (parsed?.name === '/help') {
            await this.reply(conversation, message.id, HELP_TEXT);
            await this.commit(conversation, message.id, route?.sessionId);
            return;
        }
        if (parsed?.name === '/status') {
            await this.reply(conversation, message.id, route?.sessionId === undefined ? NO_SESSION_TEXT : `当前 DSH 会话：${route.sessionId}`);
            await this.commit(conversation, message.id, route?.sessionId);
            return;
        }
        if (parsed?.name === '/new' && parsed.argument.length === 0) {
            await this.agents.reset(route?.sessionId);
            await this.reply(conversation, message.id, RESET_TEXT);
            await this.commit(conversation, message.id, undefined);
            return;
        }
        if (parsed !== undefined && parsed.name !== '/new') {
            await this.reply(conversation, message.id, UNKNOWN_COMMAND_TEXT);
            await this.commit(conversation, message.id, route?.sessionId);
            return;
        }
        const prompt = parsed?.name === '/new' ? parsed.argument : message.content.text;
        if (parsed?.name === '/new')
            await this.agents.reset(route?.sessionId);
        let sessionId = parsed?.name === '/new' ? undefined : route?.sessionId;
        let output = AGENT_FAILURE_TEXT;
        try {
            const session = await this.agents.open(sessionId);
            sessionId = session.sessionId;
            await this.updateRoute(conversation, { sessionId });
            output = await session.prompt(prompt);
        }
        catch {
            output = AGENT_FAILURE_TEXT;
        }
        await this.reply(conversation, message.id, output);
        await this.commit(conversation, message.id, sessionId);
    }
    async reply(conversation, messageId, text) {
        const parts = chunks(text);
        for (const [index, part] of parts.entries()) {
            await this.awiki.sendText({
                target: { kind: 'direct', peer: conversation.peerDid },
                text: part,
                idempotencyKey: replyKey(messageId, index),
            });
        }
    }
    async commit(conversation, messageId, sessionId) {
        await this.updateRoute(conversation, { sessionId, lastProcessedMessageId: messageId });
        try {
            await this.awiki.markConversationRead(conversation.id);
        }
        catch {
            this.logger.debug('AWiki listener could not mark a processed conversation as read');
        }
    }
    updateRoute(conversation, update) {
        const operation = this.stateMutation.then(async () => {
            const current = this.state.conversations[conversation.id];
            const route = {
                peerDid: conversation.peerDid,
                ...(update.sessionId === undefined ? {} : { sessionId: update.sessionId }),
                ...(update.lastProcessedMessageId === undefined
                    ? current?.lastProcessedMessageId === undefined ? {} : { lastProcessedMessageId: current.lastProcessedMessageId }
                    : { lastProcessedMessageId: update.lastProcessedMessageId }),
            };
            this.state = {
                version: 2,
                identityScopeHash: this.state.identityScopeHash,
                conversations: { ...this.state.conversations, [conversation.id]: route },
            };
            await this.store.save(copyState(this.state));
        });
        this.stateMutation = operation.catch(() => undefined);
        return operation;
    }
}
//# sourceMappingURL=listener.js.map