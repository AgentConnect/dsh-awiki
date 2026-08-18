import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/** AWiki trigger, identity registration, and direct/group messaging drawer. */
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { IconChevronLeftOutline14, IconCheckOutline16, IconChecklistOutline14, IconChevronDownOutline14, IconCloseOutline16, IconCopyOutline16, IconDataOutline16, IconDownloadOutline16, IconEditOutline16, IconGlobeOutline14, IconGoalOutline16, IconLoadingOutline16, IconPaperclipOutline16, IconPlusOutline16, IconRefreshOutline16, IconRefreshOutline14, IconSendOutline16, IconSparkle16, IconUserOutline16, Button, Menu, Modal, Tooltip, } from '@deepseek-ai/dsh-client-ui-primitives';
import { AWIKI_ME_APP_ICON_DATA_URL } from "./assets.js";
import { createAttachmentObjectUrl, fileToBase64, saveDownloadedAttachment } from "./file.js";
import css from './AwikiOverlay.module.css';
export const AWIKI_LAUNCHER_POSITION_KEY = 'dsh-awiki-launcher-position-v1';
const LAUNCHER_SIZE = 48;
const LAUNCHER_EDGE_GAP = 8;
const LAUNCHER_RIGHT_OFFSET = 28;
const LAUNCHER_BOTTOM_CLEARANCE = 152;
const LAUNCHER_DRAG_THRESHOLD = 4;
const DRAWER_LONG_PRESS_MS = 300;
const DRAWER_ANCHOR_GAP = 8;
const DRAWER_EDGE_GAP = 8;
const DRAWER_NOMINAL_WIDTH = 720;
const DRAWER_NOMINAL_HEIGHT = 720;
const DRAWER_HORIZONTAL_RESERVE = 80;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_BOTTOM_THRESHOLD = 24;
/** Keep the floating launcher fully reachable inside the current viewport. */
export function clampAwikiLauncherPosition(position, width, height) {
    return {
        left: Math.min(Math.max(position.left, LAUNCHER_EDGE_GAP), Math.max(LAUNCHER_EDGE_GAP, width - LAUNCHER_SIZE - LAUNCHER_EDGE_GAP)),
        top: Math.min(Math.max(position.top, LAUNCHER_EDGE_GAP), Math.max(LAUNCHER_EDGE_GAP, height - LAUNCHER_SIZE - LAUNCHER_EDGE_GAP)),
    };
}
function overflowAmount(position, panelWidth, panelHeight, viewportWidth, viewportHeight) {
    return Math.max(0, DRAWER_EDGE_GAP - position.left)
        + Math.max(0, DRAWER_EDGE_GAP - position.top)
        + Math.max(0, position.left + panelWidth + DRAWER_EDGE_GAP - viewportWidth)
        + Math.max(0, position.top + panelHeight + DRAWER_EDGE_GAP - viewportHeight);
}
/** Place the chat panel in the launcher corner quadrant with the least viewport overflow. */
export function resolveAwikiDrawerPlacement(launcher, panelWidth, panelHeight, viewportWidth, viewportHeight, preferredDirection) {
    const candidates = [
        {
            direction: 'upper-left',
            left: launcher.left - panelWidth - DRAWER_ANCHOR_GAP,
            top: launcher.top - panelHeight - DRAWER_ANCHOR_GAP,
        },
        {
            direction: 'upper-right',
            left: launcher.left + LAUNCHER_SIZE + DRAWER_ANCHOR_GAP,
            top: launcher.top - panelHeight - DRAWER_ANCHOR_GAP,
        },
        {
            direction: 'lower-left',
            left: launcher.left - panelWidth - DRAWER_ANCHOR_GAP,
            top: launcher.top + LAUNCHER_SIZE + DRAWER_ANCHOR_GAP,
        },
        {
            direction: 'lower-right',
            left: launcher.left + LAUNCHER_SIZE + DRAWER_ANCHOR_GAP,
            top: launcher.top + LAUNCHER_SIZE + DRAWER_ANCHOR_GAP,
        },
    ];
    const leastOverflow = candidates.reduce((best, candidate) => (overflowAmount(candidate, panelWidth, panelHeight, viewportWidth, viewportHeight)
        < overflowAmount(best, panelWidth, panelHeight, viewportWidth, viewportHeight)
        ? candidate
        : best));
    const selected = preferredDirection === undefined
        ? leastOverflow
        : (candidates.find(candidate => candidate.direction === preferredDirection) ?? leastOverflow);
    return {
        direction: selected.direction,
        left: Math.min(Math.max(selected.left, DRAWER_EDGE_GAP), Math.max(DRAWER_EDGE_GAP, viewportWidth - panelWidth - DRAWER_EDGE_GAP)),
        top: Math.min(Math.max(selected.top, DRAWER_EDGE_GAP), Math.max(DRAWER_EDGE_GAP, viewportHeight - panelHeight - DRAWER_EDGE_GAP)),
    };
}
function defaultLauncherPosition() {
    return clampAwikiLauncherPosition({
        left: window.innerWidth - LAUNCHER_SIZE - LAUNCHER_RIGHT_OFFSET,
        top: window.innerHeight - LAUNCHER_SIZE - LAUNCHER_BOTTOM_CLEARANCE,
    }, window.innerWidth, window.innerHeight);
}
function readLauncherPosition() {
    try {
        const stored = window.sessionStorage.getItem(AWIKI_LAUNCHER_POSITION_KEY);
        if (stored !== null) {
            const value = JSON.parse(stored);
            const { left, top } = value;
            if (typeof left === 'number' && Number.isFinite(left) && typeof top === 'number' && Number.isFinite(top)) {
                return clampAwikiLauncherPosition({ left, top }, window.innerWidth, window.innerHeight);
            }
        }
    }
    catch {
        // Storage can be unavailable in privacy-restricted browser contexts.
    }
    return defaultLauncherPosition();
}
function saveLauncherPosition(position) {
    try {
        window.sessionStorage.setItem(AWIKI_LAUNCHER_POSITION_KEY, JSON.stringify(position));
    }
    catch {
        // The launcher remains usable when session storage is unavailable.
    }
}
function callPointerCapture(target, method, pointerId) {
    const capture = Reflect.get(target, method);
    if (typeof capture === 'function')
        Reflect.apply(capture, target, [pointerId]);
}
/** Format one Host timestamp for compact local display. */
function time(value) {
    return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(value);
}
/** Show a clock within 24 hours, otherwise only the local calendar date. */
function conversationTime(value, now = Date.now()) {
    const age = now - value;
    return age >= 0 && age < ONE_DAY_MS
        ? new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(value)
        : new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(value);
}
/** Render the identity registration form and its OTP challenge transition. */
function Registration(props) {
    const [phone, setPhone] = useState('');
    const [handle, setHandle] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [notice, setNotice] = useState(null);
    const [retryDeadline, setRetryDeadline] = useState(null);
    const [retrySeconds, setRetrySeconds] = useState(0);
    useEffect(() => {
        if (retryDeadline === null)
            return;
        const update = () => {
            const remaining = Math.max(0, Math.ceil((retryDeadline - Date.now()) / 1000));
            setRetrySeconds(remaining);
            if (remaining === 0)
                setRetryDeadline(null);
        };
        update();
        const timer = setInterval(update, 250);
        return () => { clearInterval(timer); };
    }, [retryDeadline]);
    const requestOtp = async () => {
        const result = await props.sendRegistrationOtp({ handle: handle.trim(), phone: phone.trim() });
        if (!result.ok)
            return;
        const cooldownSeconds = Math.max(0, Math.ceil(result.value.retryAfterSeconds));
        setOtpSent(true);
        setRetryDeadline(Date.now() + cooldownSeconds * 1000);
        setRetrySeconds(cooldownSeconds);
        setNotice(`验证码已发送；${cooldownSeconds} 秒后可重新获取。`);
    };
    const register = async () => {
        /* v8 ignore next -- the registration action is rendered only after an OTP challenge starts. */
        if (!otpSent)
            return;
        const result = await props.registerIdentity({
            phone: phone.trim(), handle: handle.trim(), otp: otp.trim(),
        });
        if (!result.ok)
            return;
        setNotice(null);
    };
    return (_jsxs("div", { className: css.registration, children: [_jsx("div", { className: css.registrationIcon, children: _jsx(IconUserOutline16, { size: 24 }) }), _jsx("h3", { children: "\u6CE8\u518C AWiki \u8EAB\u4EFD" }), _jsx("p", { children: "\u8BE5\u8EAB\u4EFD\u7531\u5F53\u524D Harness \u90E8\u7F72\u4E2D\u7684\u5168\u90E8 Agent \u5171\u540C\u4F7F\u7528\u3002" }), _jsxs("label", { children: ["Handle", _jsx("input", { value: handle, onChange: (event) => { setHandle(event.target.value); }, autoComplete: "username", placeholder: "\u4F8B\u5982 alice" })] }), _jsxs("label", { children: ["\u624B\u673A\u53F7", _jsx("input", { value: phone, onChange: (event) => { setPhone(event.target.value); }, autoComplete: "tel" })] }), !otpSent ? (_jsx("button", { type: "button", className: css.primary, disabled: props.pending || phone.trim() === '' || handle.trim() === '', onClick: () => { void requestOtp(); }, children: "\u83B7\u53D6\u9A8C\u8BC1\u7801" })) : (_jsxs(_Fragment, { children: [_jsxs("label", { children: ["\u9A8C\u8BC1\u7801", _jsx("input", { value: otp, onChange: (event) => { setOtp(event.target.value); }, inputMode: "numeric", autoComplete: "one-time-code" })] }), _jsx("button", { type: "button", className: css.primary, disabled: props.pending || handle.trim() === '' || otp.trim() === '', onClick: () => { void register(); }, children: "\u6CE8\u518C\u8EAB\u4EFD" }), _jsx("button", { type: "button", className: css.linkButton, disabled: props.pending || retrySeconds > 0, onClick: () => { void requestOtp(); }, children: retrySeconds > 0 ? `${retrySeconds} 秒后重新获取` : '重新获取验证码' })] })), notice !== null && _jsx("p", { className: css.notice, role: "status", children: notice })] }));
}
/** Let a signed-out installation resume its preserved local identity. */
function SignedOut(props) {
    const [error, setError] = useState(null);
    const login = async () => {
        setError(null);
        const result = await props.login();
        if (!result.ok)
            setError(result.error);
    };
    return (_jsxs("div", { className: css.centerState, children: [_jsx("div", { className: css.registrationIcon, children: _jsx(IconUserOutline16, { size: 24 }) }), _jsx("h3", { children: "\u5DF2\u9000\u51FA AWiki" }), _jsx("p", { children: "\u672C\u673A\u8EAB\u4EFD\u548C\u6D88\u606F\u6570\u636E\u4ECD\u5B89\u5168\u4FDD\u7559\u3002\u91CD\u65B0\u8FDB\u5165\u540E\u4F1A\u7EE7\u7EED\u4F7F\u7528\u539F\u6765\u7684 DID \u548C Handle\u3002" }), _jsx("button", { type: "button", className: css.primary, disabled: props.pending, onClick: () => { void login(); }, children: "\u91CD\u65B0\u8FDB\u5165" }), error !== null && _jsx("small", { className: css.inlineError, role: "alert", children: error })] }));
}
/** Prefer the peer WNS display name for a direct chat; groups keep their title. */
function conversationLabel(conversation) {
    return conversation.kind === 'direct'
        ? (conversation.displayName ?? conversation.title)
        : conversation.title;
}
/** Show only the deployment identity's WNS display name, never its routing Handle. */
function identityLabel(identity) {
    return identity.displayName ?? '未设置昵称';
}
/** Editable deployment identity summary shown above the conversation roster. */
function IdentityCard(props) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(props.identity.displayName ?? '');
    const [error, setError] = useState(null);
    useEffect(() => {
        if (!editing)
            setDraft(props.identity.displayName ?? '');
    }, [editing, props.identity.displayName]);
    const cancel = () => {
        setDraft(props.identity.displayName ?? '');
        setError(null);
        setEditing(false);
    };
    const save = async () => {
        const displayName = draft.trim();
        const length = Array.from(displayName).length;
        if (length === 0) {
            setError('请输入昵称');
            return;
        }
        if (length > 50) {
            setError('昵称不能超过 50 个字符');
            return;
        }
        setError(null);
        const result = await props.updateDisplayName(displayName);
        if (!result.ok) {
            setError(result.error);
            return;
        }
        setDraft(result.value.displayName ?? displayName);
        setEditing(false);
    };
    return (_jsxs("div", { className: css.identityCard, children: [_jsx("div", { className: css.identityNameRow, children: editing ? (_jsxs("form", { className: css.identityEditor, onSubmit: (event) => { event.preventDefault(); void save(); }, children: [_jsx("input", { "aria-label": "\u6635\u79F0", autoFocus: true, disabled: props.pending, value: draft, onChange: (event) => { setDraft(event.target.value); }, onKeyDown: (event) => {
                                if (event.key === 'Escape') {
                                    event.stopPropagation();
                                    cancel();
                                }
                            } }), _jsx("button", { type: "submit", "aria-label": "\u4FDD\u5B58\u6635\u79F0", disabled: props.pending, children: _jsx(IconCheckOutline16, { size: 14 }) }), _jsx("button", { type: "button", "aria-label": "\u53D6\u6D88\u4FEE\u6539\u6635\u79F0", disabled: props.pending, onClick: cancel, children: _jsx(IconCloseOutline16, { size: 14 }) })] })) : (_jsxs(_Fragment, { children: [_jsx(Tooltip, { label: props.identity.did, side: "bottom", children: _jsx("button", { type: "button", className: css.identityName, disabled: props.pending, onClick: () => { setError(null); setEditing(true); }, children: identityLabel(props.identity) }) }), _jsx(Tooltip, { label: "\u4FEE\u6539\u6635\u79F0", side: "right", children: _jsx("button", { type: "button", className: css.identityEdit, "aria-label": "\u4FEE\u6539\u6635\u79F0", disabled: props.pending, onClick: () => { setError(null); setEditing(true); }, children: _jsx(IconEditOutline16, { size: 14 }) }) })] })) }), _jsx("small", { className: css.identityHandle, children: props.identity.handle }), _jsxs("span", { className: css.identityStatus, children: [_jsx("i", {}), "\u5728\u7EBF"] }), error !== null && _jsx("small", { className: css.identityError, role: "alert", children: error })] }));
}
/** Incoming sender label: WNS display name, then Handle, then DID. */
function senderLabel(message, peerLabel) {
    if (message.outgoing)
        return '我';
    return peerLabel ?? message.senderDisplayName ?? message.senderHandle ?? message.senderDid;
}
/** Render one direct or group conversation row. */
function ConversationRow(props) {
    const label = conversationLabel(props.conversation);
    const unreadCount = props.conversation.unreadCount ?? 0;
    const unreadLabel = unreadCount > 99 ? '99+' : String(unreadCount);
    const preview = props.conversation.lastMessagePreview ?? '暂无消息';
    return (_jsxs("button", { type: "button", className: css.conversationRow, "data-active": props.active || undefined, "aria-label": unreadCount > 0 ? `${label}，${unreadCount} 条未读消息` : undefined, onClick: props.onSelect, children: [_jsxs("span", { className: css.avatar, children: [props.conversation.kind === 'direct' ? '私' : '群', unreadCount > 0 && _jsx("span", { className: css.conversationUnreadBadge, "aria-hidden": "true", children: unreadLabel })] }), _jsxs("span", { className: css.conversationText, children: [_jsxs("span", { className: css.conversationHeader, children: [_jsx("strong", { children: label }), props.conversation.lastMessageAt !== undefined && (_jsx("time", { className: css.conversationTime, children: conversationTime(props.conversation.lastMessageAt) }))] }), _jsx("small", { children: preview })] })] }));
}
/** Render one AWiki message, including an attachment download action. */
function MessageRow(props) {
    const [error, setError] = useState(null);
    const [preview, setPreview] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const imageAttachmentId = props.message.content.kind === 'attachment' && props.message.content.attachment.mimeType.startsWith('image/')
        ? props.message.content.attachment.id
        : null;
    useEffect(() => {
        if (imageAttachmentId === null)
            return;
        let disposed = false;
        let objectUrl = null;
        setPreview(null);
        setPreviewLoading(true);
        setError(null);
        void props.download(props.message.id, imageAttachmentId).then((result) => {
            if (disposed)
                return;
            setPreviewLoading(false);
            if (!result.ok) {
                setError(result.error);
                return;
            }
            objectUrl = createAttachmentObjectUrl(result.value);
            setPreview({ url: objectUrl, value: result.value });
        });
        return () => {
            disposed = true;
            if (objectUrl !== null)
                URL.revokeObjectURL(objectUrl);
        };
    }, [imageAttachmentId, props.download, props.message.id]);
    const download = async () => {
        /* v8 ignore next -- only attachment content renders the button that invokes this closure. */
        if (props.message.content.kind !== 'attachment')
            return;
        if (preview !== null) {
            saveDownloadedAttachment(preview.value);
            return;
        }
        const result = await props.download(props.message.id, props.message.content.attachment.id);
        if (!result.ok) {
            setError(result.error);
            return;
        }
        saveDownloadedAttachment(result.value);
    };
    return (_jsxs("div", { className: css.message, "data-message-id": props.message.id, "data-outgoing": props.message.outgoing || undefined, children: [_jsxs("div", { className: css.messageMeta, children: [_jsx("span", { children: senderLabel(props.message, props.peerLabel) }), _jsx("time", { children: time(props.message.sentAt) })] }), props.message.content.kind === 'text' ? (_jsx("p", { children: props.message.content.text })) : preview !== null ? (_jsxs(_Fragment, { children: [_jsxs("button", { type: "button", className: css.imageAttachment, "aria-label": `下载图片 ${props.message.content.attachment.fileName}`, onClick: () => { void download(); }, children: [_jsx("img", { src: preview.url, alt: props.message.content.attachment.fileName, onLoad: () => { props.onImageLoad?.(props.message.id); } }), _jsxs("span", { children: [_jsx("strong", { children: props.message.content.attachment.fileName }), _jsxs("small", { children: [props.message.content.attachment.size, " \u5B57\u8282"] }), _jsx(IconDownloadOutline16, { size: 16 })] })] }), props.message.content.caption !== undefined && _jsx("p", { className: css.caption, children: props.message.content.caption })] })) : (_jsxs(_Fragment, { children: [_jsxs("button", { type: "button", className: css.attachment, disabled: previewLoading, onClick: () => { void download(); }, children: [_jsxs("span", { children: [_jsx("strong", { children: props.message.content.attachment.fileName }), _jsx("small", { children: previewLoading ? '正在加载图片预览…' : `${props.message.content.attachment.size} 字节` })] }), _jsx(IconDownloadOutline16, { size: 16 })] }), props.message.content.caption !== undefined && _jsx("p", { className: css.caption, children: props.message.content.caption })] })), error !== null && _jsx("small", { className: css.inlineError, children: error })] }));
}
/** Render one optimistic outgoing bubble while the Host confirms delivery. */
function PendingMessageRow(props) {
    return (_jsxs("div", { className: css.pendingMessage, role: "status", "aria-live": "polite", "aria-label": "\u6D88\u606F\u53D1\u9001\u4E2D", children: [_jsx(IconLoadingOutline16, { className: css.pendingMessageSpinner, size: 14 }), _jsxs("div", { className: css.pendingMessageContent, children: [_jsxs("div", { className: css.messageMeta, children: [_jsx("span", { children: "\u6211" }), _jsx("time", { children: time(props.draft.startedAt) })] }), props.draft.content.kind === 'text' ? (_jsx("p", { children: props.draft.content.text })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: css.pendingAttachment, children: [_jsx(IconPaperclipOutline16, { size: 16 }), _jsxs("span", { children: [_jsx("strong", { children: props.draft.content.fileName }), _jsxs("small", { children: [props.draft.content.size, " \u5B57\u8282"] })] })] }), props.draft.content.caption !== undefined && _jsx("p", { className: css.pendingCaption, children: props.draft.content.caption })] }))] })] }));
}
function summaryRangeLabel(summary) {
    const scope = summary.range.kind === 'unread' ? '未读以来' : '最近消息';
    const formatter = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${scope} · ${summary.range.messageCount} 条消息 · ${formatter.format(summary.range.startedAt)}–${formatter.format(summary.range.endedAt)}`;
}
function copiedSummary(summary) {
    const sections = [
        'AI 对话总结',
        `范围：${summaryRangeLabel(summary)}`,
        '',
        '重点',
        ...summary.highlights.map(item => `- ${item}`),
        '',
        '结论',
        ...summary.conclusions.map(item => `- ${item}`),
        '',
        '待办',
        ...summary.todos.map(item => `- ${item.owner === undefined ? '' : `${item.owner}：`}${item.text}`),
    ];
    return sections.join('\n');
}
/** Render every user-visible summary state without obscuring history or the composer. */
function SummaryPanel(props) {
    const [copyState, setCopyState] = useState('idle');
    const result = props.summary.result;
    useEffect(() => { setCopyState('idle'); }, [result]);
    if (props.summary.collapsed) {
        return (_jsx("div", { id: props.id, className: css.summaryPanel, "data-collapsed": true, children: _jsxs("button", { type: "button", className: css.summaryCollapsed, "aria-label": "\u5C55\u5F00 AI \u5BF9\u8BDD\u603B\u7ED3", "aria-expanded": "false", onClick: () => { props.collapse(false); }, children: [_jsxs("span", { children: [_jsx(IconSparkle16, { size: 14 }), "AI \u5BF9\u8BDD\u603B\u7ED3"] }), result !== undefined && _jsx("small", { children: summaryRangeLabel(result) }), props.summary.stale && _jsx("em", { children: "\u6709\u65B0\u6D88\u606F" }), _jsx(IconChevronDownOutline14, { size: 14 })] }) }));
    }
    const copy = async () => {
        if (result === undefined)
            return;
        try {
            await navigator.clipboard.writeText(copiedSummary(result));
            setCopyState('copied');
        }
        catch {
            setCopyState('error');
        }
    };
    return (_jsxs("section", { id: props.id, className: css.summaryPanel, "aria-label": "AI \u5BF9\u8BDD\u603B\u7ED3", "aria-live": "polite", children: [_jsxs("header", { className: css.summaryHeader, children: [_jsxs("span", { children: [_jsx(IconSparkle16, { size: 15 }), _jsx("strong", { children: "AI \u5BF9\u8BDD\u603B\u7ED3" })] }), result !== undefined && _jsx("small", { children: summaryRangeLabel(result) }), _jsx("button", { type: "button", "aria-label": "\u6298\u53E0 AI \u5BF9\u8BDD\u603B\u7ED3", "aria-expanded": "true", onClick: () => { props.collapse(true); }, children: _jsx(IconChevronDownOutline14, { size: 14 }) })] }), props.summary.status === 'loading' && (_jsxs("div", { className: css.summaryLoading, role: "status", children: [_jsx(IconLoadingOutline16, { size: 18 }), _jsxs("span", { children: [_jsx("strong", { children: "\u6B63\u5728\u6574\u7406\u8FD9\u6BB5\u5BF9\u8BDD\u2026" }), _jsx("small", { children: "\u53EA\u4F1A\u5904\u7406\u672C\u6B21\u9009\u62E9\u7684\u6D88\u606F\u8303\u56F4" })] })] })), props.summary.status === 'error' && (_jsxs("div", { className: css.summaryError, role: "alert", children: [_jsx("span", { children: props.summary.error ?? '暂时无法生成 AI 总结。' }), _jsxs("button", { type: "button", "aria-label": "\u91CD\u65B0\u751F\u6210 AI \u603B\u7ED3", onClick: props.regenerate, children: [_jsx(IconRefreshOutline14, { size: 14 }), "\u91CD\u65B0\u751F\u6210"] })] })), props.summary.status === 'success' && result !== undefined && (_jsxs(_Fragment, { children: [props.summary.stale && (_jsxs("div", { className: css.summaryStale, role: "status", children: [_jsx("span", { children: "\u6709\u65B0\u6D88\u606F\uFF0C\u5F53\u524D\u603B\u7ED3\u5DF2\u8FC7\u671F" }), _jsx("button", { type: "button", "aria-label": "\u6839\u636E\u65B0\u6D88\u606F\u91CD\u65B0\u751F\u6210 AI \u603B\u7ED3", onClick: props.regenerate, children: "\u91CD\u65B0\u751F\u6210" })] })), _jsxs("div", { className: css.summaryBody, children: [_jsxs("div", { className: css.summarySection, children: [_jsxs("h4", { children: [_jsx(IconGoalOutline16, { size: 15 }), "\u91CD\u70B9"] }), result.highlights.length === 0 ? _jsx("p", { children: "\u6682\u65E0\u660E\u786E\u91CD\u70B9" }) : _jsx("ul", { children: result.highlights.map(item => _jsx("li", { children: item }, item)) })] }), _jsxs("div", { className: css.summarySection, children: [_jsxs("h4", { children: [_jsx(IconCheckOutline16, { size: 15 }), "\u7ED3\u8BBA"] }), result.conclusions.length === 0 ? _jsx("p", { children: "\u6682\u65E0\u660E\u786E\u7ED3\u8BBA" }) : _jsx("ul", { children: result.conclusions.map(item => _jsx("li", { children: item }, item)) })] }), _jsxs("div", { className: css.summarySection, children: [_jsxs("h4", { children: [_jsx(IconChecklistOutline14, { size: 15 }), "\u5F85\u529E"] }), result.todos.length === 0 ? _jsx("p", { children: "\u6682\u65E0\u5F85\u529E" }) : _jsx("ul", { children: result.todos.map(item => _jsxs("li", { children: [item.owner === undefined ? '' : _jsxs("b", { children: [item.owner, "\uFF1A"] }), item.text] }, `${item.owner ?? ''}:${item.text}`)) })] })] }), _jsxs("footer", { className: css.summaryActions, children: [_jsx("button", { type: "button", onClick: () => { props.viewSource(result.range.firstMessageId); }, children: "\u67E5\u770B\u539F\u6D88\u606F" }), _jsx("span", {}), _jsxs("button", { type: "button", "aria-label": "\u91CD\u65B0\u751F\u6210 AI \u603B\u7ED3", onClick: props.regenerate, children: [_jsx(IconRefreshOutline14, { size: 14 }), "\u91CD\u65B0\u751F\u6210"] }), _jsxs("button", { type: "button", onClick: () => { void copy(); }, children: [_jsx(IconCopyOutline16, { size: 14 }), copyState === 'copied' ? '已复制' : '复制'] })] }), copyState === 'error' && _jsx("div", { className: css.summaryCopyError, role: "alert", children: "\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5\u3002" }), _jsxs("div", { className: css.summaryPrivacy, children: [_jsx(IconDataOutline16, { size: 14 }), "\u4EC5\u53D1\u9001\u6240\u9009\u8303\u56F4\u7684\u6587\u672C\u4E0E\u9644\u4EF6\u5143\u6570\u636E\uFF0C\u4E0D\u53D1\u9001\u9644\u4EF6\u6587\u4EF6"] })] }))] }));
}
/** Render the conversation roster, history, composer, and one-file picker. */
function Chat(props) {
    const { view } = props;
    const [text, setText] = useState('');
    const [file, setFile] = useState(null);
    const [sendingDraft, setSendingDraft] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [fileError, setFileError] = useState(null);
    const input = useRef(null);
    const history = useRef(null);
    const previousConversationId = useRef(null);
    const previousMessageTail = useRef(null);
    const selectedConversationId = useRef(view.selectedConversationId);
    const conversationAwaitingBottom = useRef(null);
    const pendingInitialImages = useRef(new Set());
    const historyPinnedToBottom = useRef(true);
    const [historyAwayFromBottom, setHistoryAwayFromBottom] = useState(false);
    const [unseenMessageCount, setUnseenMessageCount] = useState(0);
    const selected = view.conversations.find(value => value.id === view.selectedConversationId);
    const summary = selected === undefined ? undefined : view.summaries[selected.id];
    const summaryPanelId = useId();
    selectedConversationId.current = view.selectedConversationId;
    const visibleSendingDraft = sendingDraft?.conversationId === view.selectedConversationId ? sendingDraft : null;
    const markSelectedConversationReadAtBottom = () => {
        const node = history.current;
        const newestRendered = view.messages.at(-1);
        if (node === null
            || selected === undefined
            || newestRendered === undefined
            || (selected.unreadCount ?? 0) <= 0
            || view.localPending
            || (selected.lastMessageAt !== undefined && newestRendered.sentAt < selected.lastMessageAt)
            || node.scrollHeight - node.scrollTop - node.clientHeight > HISTORY_BOTTOM_THRESHOLD)
            return;
        void props.markSelectedConversationRead();
    };
    const scrollHistoryToLatest = (smooth) => {
        const node = history.current;
        if (node === null)
            return;
        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
        if (smooth && !reduceMotion && typeof node.scrollTo === 'function') {
            node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
        }
        else {
            node.scrollTop = node.scrollHeight;
        }
        historyPinnedToBottom.current = true;
        setHistoryAwayFromBottom(false);
        setUnseenMessageCount(0);
        if (!smooth || reduceMotion || typeof node.scrollTo !== 'function') {
            markSelectedConversationReadAtBottom();
        }
    };
    const syncHistoryPosition = () => {
        const node = history.current;
        if (node === null)
            return;
        const atBottom = node.scrollHeight - node.scrollTop - node.clientHeight <= HISTORY_BOTTOM_THRESHOLD;
        historyPinnedToBottom.current = atBottom;
        setHistoryAwayFromBottom(!atBottom);
        if (atBottom) {
            setUnseenMessageCount(0);
            markSelectedConversationReadAtBottom();
        }
    };
    useLayoutEffect(() => {
        markSelectedConversationReadAtBottom();
    }, [selected?.id, selected?.lastMessageAt, selected?.unreadCount, view.localPending, view.messages]);
    useLayoutEffect(() => {
        const conversationId = view.selectedConversationId;
        if (conversationId !== previousConversationId.current) {
            previousConversationId.current = conversationId;
            conversationAwaitingBottom.current = conversationId;
            pendingInitialImages.current.clear();
            previousMessageTail.current = conversationId === null
                ? null
                : { conversationId, messageId: view.messages.at(-1)?.id ?? null };
            historyPinnedToBottom.current = true;
            setHistoryAwayFromBottom(false);
            setUnseenMessageCount(0);
        }
        if (conversationId === null || history.current === null)
            return;
        if (view.localPending)
            return;
        if (conversationAwaitingBottom.current === conversationId) {
            if (view.messages.length === 0)
                return;
            pendingInitialImages.current = new Set(view.messages.flatMap(message => (message.content.kind === 'attachment' && message.content.attachment.mimeType.startsWith('image/')
                ? [message.id]
                : [])));
            previousMessageTail.current = { conversationId, messageId: view.messages.at(-1)?.id ?? null };
            scrollHistoryToLatest(false);
            if (pendingInitialImages.current.size === 0) {
                conversationAwaitingBottom.current = null;
                markSelectedConversationReadAtBottom();
            }
            return;
        }
        const previous = previousMessageTail.current;
        previousMessageTail.current = { conversationId, messageId: view.messages.at(-1)?.id ?? null };
        if (previous?.conversationId !== conversationId || previous.messageId === null)
            return;
        const previousTailIndex = view.messages.findIndex(message => message.id === previous.messageId);
        if (previousTailIndex < 0 || previousTailIndex === view.messages.length - 1)
            return;
        const appendedMessageCount = view.messages.length - previousTailIndex - 1;
        if (historyPinnedToBottom.current) {
            scrollHistoryToLatest(false);
        }
        else {
            setHistoryAwayFromBottom(true);
            setUnseenMessageCount(current => current + appendedMessageCount);
        }
    }, [view.localPending, view.messages, view.selectedConversationId]);
    useLayoutEffect(() => {
        if (visibleSendingDraft === null || history.current === null)
            return;
        scrollHistoryToLatest(false);
    }, [visibleSendingDraft]);
    const scrollAfterInitialImage = (messageId) => {
        if (selected === undefined || conversationAwaitingBottom.current !== selected.id)
            return;
        if (!pendingInitialImages.current.delete(messageId))
            return;
        if (history.current !== null)
            scrollHistoryToLatest(false);
        if (pendingInitialImages.current.size === 0)
            conversationAwaitingBottom.current = null;
        if (pendingInitialImages.current.size === 0)
            markSelectedConversationReadAtBottom();
    };
    const viewSummarySource = (messageId) => {
        if (selected === undefined)
            return;
        props.setSummaryCollapsed(selected.id, true);
        requestAnimationFrame(() => {
            const node = [...(history.current?.querySelectorAll('[data-message-id]') ?? [])]
                .find(candidate => candidate.dataset.messageId === messageId);
            if (node === undefined)
                return;
            node.scrollIntoView({ block: 'center' });
            node.tabIndex = -1;
            node.focus({ preventScroll: true });
        });
    };
    useEffect(() => {
        if (file === null || !file.type.startsWith('image/')) {
            setPreviewUrl(null);
            return;
        }
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        return () => { URL.revokeObjectURL(url); };
    }, [file]);
    const clearFile = () => {
        setFile(null);
        setFileError(null);
        /* v8 ignore else -- the clear action is available only while the mounted file input owns the selection. */
        if (input.current !== null)
            input.current.value = '';
    };
    const sendMessage = async () => {
        if (sendingDraft !== null || view.selectedConversationId === null)
            return;
        const draft = text.trim();
        const conversationId = view.selectedConversationId;
        if (file === null) {
            /* v8 ignore next -- the only invocation control is disabled while both text and attachment are empty. */
            if (draft === '')
                return;
            setSendingDraft({ conversationId, startedAt: Date.now(), content: { kind: 'text', text: draft } });
            setText('');
            const result = await props.sendText(draft);
            setSendingDraft(null);
            if (!result.ok && selectedConversationId.current === conversationId)
                setText(draft);
            return;
        }
        if (file.size > view.attachmentMaxBytes) {
            setFileError(`附件不能超过 ${view.attachmentMaxBytes} 字节。`);
            return;
        }
        setFileError(null);
        const selectedFile = file;
        const bytesBase64 = await fileToBase64(selectedFile);
        setSendingDraft({
            conversationId,
            startedAt: Date.now(),
            content: {
                kind: 'attachment',
                fileName: selectedFile.name,
                size: selectedFile.size,
                ...(draft === '' ? {} : { caption: draft }),
            },
        });
        clearFile();
        setText('');
        const result = await props.sendAttachment({
            fileName: selectedFile.name,
            mimeType: selectedFile.type || 'application/octet-stream',
            bytesBase64,
            ...(draft === '' ? {} : { caption: draft }),
        });
        setSendingDraft(null);
        if (!result.ok && selectedConversationId.current === conversationId) {
            setFile(selectedFile);
            setText(draft);
        }
    };
    return (_jsxs("div", { className: css.chat, children: [_jsxs("aside", { className: css.roster, "data-hidden": selected !== undefined || undefined, children: [_jsx(IdentityCard, { identity: view.identity, pending: view.pending !== null, updateDisplayName: props.updateDisplayName }), _jsx("div", { className: css.rosterTitle, children: "\u4F1A\u8BDD" }), _jsxs("div", { className: css.conversationList, children: [view.conversations.map(conversation => (_jsx(ConversationRow, { conversation: conversation, active: conversation.id === view.selectedConversationId, onSelect: () => { void props.selectConversation(conversation.id); } }, conversation.id))), view.conversations.length === 0 && _jsx("p", { className: css.empty, children: "\u8FD8\u6CA1\u6709\u53EF\u7528\u7684\u79C1\u804A\u6216\u7FA4\u804A\u3002" })] }), view.conversationsHasMore && _jsx("button", { type: "button", className: css.more, onClick: () => { void props.loadMoreConversations(); }, children: "\u52A0\u8F7D\u66F4\u591A\u4F1A\u8BDD" })] }), _jsx("section", { className: css.thread, "data-visible": selected !== undefined || undefined, children: selected === undefined ? (_jsxs("div", { className: css.threadEmpty, children: [_jsx(IconGlobeOutline14, { size: 28 }), _jsx("p", { children: "\u9009\u62E9\u4E00\u4E2A\u79C1\u804A\u6216\u7FA4\u804A\u67E5\u770B\u6D88\u606F\u3002" })] })) : (_jsxs(_Fragment, { children: [_jsxs("header", { className: css.threadHeader, children: [_jsx("button", { type: "button", className: css.back, "aria-label": "\u8FD4\u56DE\u4F1A\u8BDD\u5217\u8868", onClick: () => { void props.selectConversation(null); }, children: _jsx(IconChevronLeftOutline14, {}) }), _jsxs("div", { className: css.threadTitle, children: [_jsx("strong", { children: conversationLabel(selected) }), _jsx("small", { children: selected.kind === 'direct' ? '私聊' : '群聊' })] }), view.refreshing && view.messages.length > 0 && (_jsxs("span", { className: css.threadRefreshing, role: "status", children: [_jsx(IconLoadingOutline16, { size: 12 }), "\u6B63\u5728\u5237\u65B0"] })), _jsxs("button", { type: "button", className: css.summaryTrigger, "aria-controls": summaryPanelId, "aria-expanded": summary === undefined ? undefined : !summary.collapsed, "aria-label": summary?.status === 'loading' ? '正在生成 AI 总结' : summary?.collapsed === true ? '展开 AI 总结' : '生成 AI 总结', disabled: summary?.status === 'loading', onClick: () => {
                                        if (summary !== undefined && !summary.collapsed && summary.status !== 'error') {
                                            props.setSummaryCollapsed(selected.id, true);
                                        }
                                        else if (summary?.collapsed === true) {
                                            props.setSummaryCollapsed(selected.id, false);
                                        }
                                        else {
                                            void props.summarizeConversation();
                                        }
                                    }, children: [summary?.status === 'loading' ? _jsx(IconLoadingOutline16, { size: 14 }) : _jsx(IconSparkle16, { size: 14 }), _jsx("span", { children: summary?.status === 'loading' ? '总结中' : 'AI 总结' }), summary !== undefined && _jsx(IconChevronDownOutline14, { size: 12 })] })] }), summary !== undefined && (_jsx(SummaryPanel, { id: summaryPanelId, summary: summary, regenerate: () => { void props.summarizeConversation(); }, collapse: collapsed => { props.setSummaryCollapsed(selected.id, collapsed); }, viewSource: viewSummarySource })), _jsxs("div", { className: css.historyShell, children: [_jsxs("div", { ref: history, className: css.history, role: "log", "aria-label": "\u6D88\u606F\u8BB0\u5F55", onScroll: syncHistoryPosition, children: [view.historyHasMore && _jsx("button", { type: "button", className: css.more, onClick: () => { void props.loadOlderHistory(); }, children: "\u52A0\u8F7D\u66F4\u65E9\u6D88\u606F" }), view.localPending && (_jsxs("div", { className: css.historyLoading, role: "status", "aria-live": "polite", "aria-label": "\u6B63\u5728\u8BFB\u53D6\u672C\u5730\u6D88\u606F", children: [_jsx(IconLoadingOutline16, { size: 18 }), _jsx("span", { children: "\u6B63\u5728\u8BFB\u53D6\u672C\u5730\u6D88\u606F\u2026" })] })), !view.localPending && view.refreshing && view.messages.length === 0 && (_jsxs("div", { className: css.historyLoading, role: "status", "aria-live": "polite", "aria-label": "\u6B63\u5728\u540C\u6B65\u6D88\u606F", children: [_jsx(IconLoadingOutline16, { size: 18 }), _jsx("span", { children: "\u6B63\u5728\u540C\u6B65\u6D88\u606F\u2026" })] })), view.messages.map(message => (_jsx(MessageRow, { message: message, peerLabel: selected.kind === 'direct' ? conversationLabel(selected) : undefined, download: props.downloadAttachment, onImageLoad: scrollAfterInitialImage }, message.id))), visibleSendingDraft !== null && _jsx(PendingMessageRow, { draft: visibleSendingDraft }), !view.localPending && !view.refreshing && view.messages.length === 0 && visibleSendingDraft === null && _jsx("p", { className: css.empty, children: "\u6682\u65E0\u6D88\u606F\u3002" })] }), historyAwayFromBottom && (_jsxs("button", { type: "button", className: css.latestMessages, "aria-label": unseenMessageCount === 0 ? '下滑到最新消息' : `有 ${unseenMessageCount} 条新消息，下滑到最新消息`, onClick: () => { scrollHistoryToLatest(true); }, children: [_jsx(IconChevronDownOutline14, { size: 14 }), unseenMessageCount > 0 && _jsxs("span", { children: ["\u65B0\u6D88\u606F\uFF08", unseenMessageCount, "\uFF09"] })] }))] }), _jsxs("div", { className: css.composer, children: [fileError !== null && _jsx("small", { className: css.inlineError, role: "alert", children: fileError }), _jsxs("div", { className: css.composeInput, children: [file !== null && (_jsxs("div", { className: css.filePreview, "data-image": previewUrl !== null || undefined, children: [previewUrl === null
                                                    ? _jsx("span", { className: css.filePreviewIcon, children: _jsx(IconPaperclipOutline16, {}) })
                                                    : _jsx("img", { src: previewUrl, alt: file.name }), previewUrl === null && _jsx("span", { className: css.filePreviewName, children: file.name }), _jsx("button", { type: "button", className: css.removeFile, "aria-label": `移除附件 ${file.name}`, onClick: clearFile, children: _jsx(IconCloseOutline16, { size: 12 }) })] })), _jsx("textarea", { value: text, onChange: (event) => { setText(event.target.value); }, onKeyDown: (event) => {
                                                if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing)
                                                    return;
                                                event.preventDefault();
                                                if (view.pending === null && sendingDraft === null && (file !== null || text.trim() !== ''))
                                                    void sendMessage();
                                            }, placeholder: "\u8F93\u5165\u6D88\u606F", rows: 2 }), _jsxs("div", { className: css.composeActions, children: [_jsx(Tooltip, { label: "\u6DFB\u52A0\u9644\u4EF6", side: "top", children: _jsx("button", { type: "button", className: css.filePicker, "aria-label": "\u6DFB\u52A0\u9644\u4EF6", disabled: view.pending !== null || sendingDraft !== null, onClick: () => { input.current?.click(); }, children: _jsx(IconPaperclipOutline16, {}) }) }), _jsx("input", { ref: input, type: "file", className: css.fileInput, "aria-label": "\u9009\u62E9\u4E00\u4E2A\u9644\u4EF6", onChange: (event) => { setFile(event.target.files?.[0] ?? null); setFileError(null); } }), _jsx("button", { type: "button", className: css.send, "aria-label": "\u53D1\u9001\u6D88\u606F", disabled: view.pending !== null || sendingDraft !== null || (file === null && text.trim() === ''), onClick: () => { void sendMessage(); }, children: _jsx(IconSendOutline16, {}) })] })] })] })] })) })] }));
}
/**
 * Render the frame-wide AWiki trigger and right-side drawer.
 * @param props - slot-derived runtime, store, and injected AWiki operations.
 * @returns the persistent trigger and the conditionally mounted drawer.
 */
export function AwikiOverlay(props) {
    const open = props.useStore(state => state.open);
    const view = props.useAwiki(state => state);
    const titleId = useId();
    const composeTitleId = useId();
    const [accountMenuOpen, setAccountMenuOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [composeDirect, setComposeDirect] = useState(false);
    const [peerHandle, setPeerHandle] = useState('');
    const [composeError, setComposeError] = useState(null);
    const [logoutOpen, setLogoutOpen] = useState(false);
    const [logoutPending, setLogoutPending] = useState(false);
    const [logoutError, setLogoutError] = useState(null);
    const [launcherPosition, setLauncherPosition] = useState(readLauncherPosition);
    const [launcherDragging, setLauncherDragging] = useState(false);
    const [drawerDragging, setDrawerDragging] = useState(false);
    const [drawerDragDirection, setDrawerDragDirection] = useState(null);
    const launcherRef = useRef(null);
    const rememberedConversationId = useRef(null);
    const drawerWasOpen = useRef(open);
    const suppressLauncherClick = useRef(false);
    const launcherDrag = useRef(null);
    const drawerDrag = useRef(null);
    const registered = view.status === 'ready' && view.identity !== null;
    const unreadCount = view.conversations.reduce((total, conversation) => total + (conversation.unreadCount ?? 0), 0);
    const unreadLabel = unreadCount > 99 ? '99+' : String(unreadCount);
    const drawerWidth = Math.min(DRAWER_NOMINAL_WIDTH, Math.max(1, window.innerWidth - DRAWER_HORIZONTAL_RESERVE));
    const drawerHeight = Math.min(DRAWER_NOMINAL_HEIGHT, Math.max(1, window.innerHeight - DRAWER_EDGE_GAP * 2));
    const drawerPlacement = resolveAwikiDrawerPlacement(launcherPosition, drawerWidth, drawerHeight, window.innerWidth, window.innerHeight, drawerDragDirection ?? undefined);
    useEffect(() => {
        void props.open();
        return props.close;
    }, [props.close, props.open]);
    useEffect(() => () => {
        const drag = drawerDrag.current;
        if (drag !== null)
            clearTimeout(drag.timer);
    }, []);
    useEffect(() => {
        const wasOpen = drawerWasOpen.current;
        drawerWasOpen.current = open;
        if (open) {
            if (view.selectedConversationId !== null) {
                rememberedConversationId.current = view.selectedConversationId;
            }
            else if (!wasOpen && rememberedConversationId.current !== null) {
                const remembered = rememberedConversationId.current;
                if (view.conversations.some(conversation => conversation.id === remembered)) {
                    void props.selectConversation(remembered);
                }
                else {
                    rememberedConversationId.current = null;
                }
            }
            return;
        }
        setAccountMenuOpen(false);
        setMenuOpen(false);
        setComposeDirect(false);
        setPeerHandle('');
        setComposeError(null);
        const drag = drawerDrag.current;
        if (drag !== null)
            clearTimeout(drag.timer);
        drawerDrag.current = null;
        setDrawerDragging(false);
        setDrawerDragDirection(null);
        if (wasOpen && view.selectedConversationId !== null) {
            rememberedConversationId.current = view.selectedConversationId;
            void props.selectConversation(null);
        }
    }, [open, props.selectConversation, view.conversations, view.selectedConversationId]);
    const selectConversation = (conversationId) => {
        rememberedConversationId.current = conversationId;
        return props.selectConversation(conversationId);
    };
    useEffect(() => {
        if (!open)
            return;
        const onKeyDown = (event) => {
            if (event.key !== 'Escape')
                return;
            if (logoutOpen) {
                if (!logoutPending)
                    setLogoutOpen(false);
                return;
            }
            if (composeDirect) {
                setComposeDirect(false);
                return;
            }
            if (menuOpen) {
                setMenuOpen(false);
                return;
            }
            if (accountMenuOpen) {
                setAccountMenuOpen(false);
                return;
            }
            props.actions.close();
            launcherRef.current?.focus();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => { document.removeEventListener('keydown', onKeyDown); };
    }, [open, accountMenuOpen, composeDirect, logoutOpen, logoutPending, menuOpen, props.actions]);
    useEffect(() => {
        const onResize = () => {
            setLauncherPosition((current) => {
                const next = clampAwikiLauncherPosition(current, window.innerWidth, window.innerHeight);
                saveLauncherPosition(next);
                return next;
            });
        };
        window.addEventListener('resize', onResize);
        return () => { window.removeEventListener('resize', onResize); };
    }, []);
    const onLauncherPointerDown = (event) => {
        if (event.button !== 0)
            return;
        launcherDrag.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            origin: launcherPosition,
            moved: false,
            current: launcherPosition,
        };
        callPointerCapture(event.currentTarget, 'setPointerCapture', event.pointerId);
    };
    const onLauncherPointerMove = (event) => {
        const drag = launcherDrag.current;
        if (drag === null || drag.pointerId !== event.pointerId)
            return;
        const deltaX = event.clientX - drag.startX;
        const deltaY = event.clientY - drag.startY;
        if (!drag.moved && Math.hypot(deltaX, deltaY) < LAUNCHER_DRAG_THRESHOLD)
            return;
        drag.moved = true;
        setLauncherDragging(true);
        drag.current = clampAwikiLauncherPosition({
            left: drag.origin.left + deltaX,
            top: drag.origin.top + deltaY,
        }, window.innerWidth, window.innerHeight);
        setLauncherPosition(drag.current);
    };
    const finishLauncherDrag = (event) => {
        const drag = launcherDrag.current;
        if (drag === null || drag.pointerId !== event.pointerId)
            return;
        if (drag.moved) {
            suppressLauncherClick.current = true;
            saveLauncherPosition(drag.current);
        }
        launcherDrag.current = null;
        setLauncherDragging(false);
        callPointerCapture(event.currentTarget, 'releasePointerCapture', event.pointerId);
    };
    const onDrawerPointerDown = (event) => {
        if (event.button !== 0
            || event.target.closest('button, input, textarea, a, [role="button"]') !== null)
            return;
        const drag = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            origin: launcherPosition,
            timer: undefined,
            armed: false,
            moved: false,
            current: launcherPosition,
        };
        drag.timer = setTimeout(() => {
            if (drawerDrag.current !== drag)
                return;
            drag.armed = true;
            setDrawerDragging(true);
            setDrawerDragDirection(drawerPlacement.direction);
        }, DRAWER_LONG_PRESS_MS);
        drawerDrag.current = drag;
        callPointerCapture(event.currentTarget, 'setPointerCapture', event.pointerId);
    };
    const onDrawerPointerMove = (event) => {
        const drag = drawerDrag.current;
        if (drag === null || drag.pointerId !== event.pointerId)
            return;
        const deltaX = event.clientX - drag.startX;
        const deltaY = event.clientY - drag.startY;
        if (!drag.armed) {
            if (Math.hypot(deltaX, deltaY) < LAUNCHER_DRAG_THRESHOLD)
                return;
            clearTimeout(drag.timer);
            drawerDrag.current = null;
            callPointerCapture(event.currentTarget, 'releasePointerCapture', event.pointerId);
            return;
        }
        event.preventDefault();
        drag.moved = true;
        drag.current = clampAwikiLauncherPosition({
            left: drag.origin.left + deltaX,
            top: drag.origin.top + deltaY,
        }, window.innerWidth, window.innerHeight);
        setLauncherPosition(drag.current);
    };
    const finishDrawerDrag = (event) => {
        const drag = drawerDrag.current;
        if (drag === null || drag.pointerId !== event.pointerId)
            return;
        clearTimeout(drag.timer);
        if (drag.moved)
            saveLauncherPosition(drag.current);
        drawerDrag.current = null;
        setDrawerDragging(false);
        setDrawerDragDirection(null);
        callPointerCapture(event.currentTarget, 'releasePointerCapture', event.pointerId);
    };
    const toggleLauncher = () => {
        if (suppressLauncherClick.current) {
            suppressLauncherClick.current = false;
            return;
        }
        props.actions.toggle();
    };
    const startDirect = async () => {
        setComposeError(null);
        const result = await props.startDirectChat(peerHandle);
        if (!result.ok) {
            setComposeError(result.error);
            return;
        }
        setComposeDirect(false);
        setPeerHandle('');
    };
    const logout = async () => {
        setLogoutPending(true);
        setLogoutError(null);
        const result = await props.logout();
        setLogoutPending(false);
        if (!result.ok) {
            setLogoutError(result.error);
            return;
        }
        rememberedConversationId.current = null;
        setLogoutOpen(false);
    };
    return (_jsxs(_Fragment, { children: [_jsxs("button", { ref: launcherRef, type: "button", className: css.trigger, style: { left: launcherPosition.left, top: launcherPosition.top }, "data-dragging": launcherDragging || undefined, "aria-label": open
                    ? '收起 AWiki'
                    : unreadCount > 0 ? `打开 AWiki，${unreadCount} 条未读消息` : '打开 AWiki', "aria-expanded": open, "aria-haspopup": "dialog", title: "AWiki", onClick: toggleLauncher, onPointerDown: onLauncherPointerDown, onPointerMove: onLauncherPointerMove, onPointerUp: finishLauncherDrag, onPointerCancel: finishLauncherDrag, children: [_jsx("img", { className: css.launcherIcon, src: AWIKI_ME_APP_ICON_DATA_URL, alt: "", "aria-hidden": "true", draggable: "false" }), unreadCount > 0 && _jsx("span", { className: css.unreadBadge, "aria-hidden": "true", children: unreadLabel })] }), open && (_jsxs("div", { className: css.drawer, style: { left: drawerPlacement.left, top: drawerPlacement.top }, "data-placement": drawerPlacement.direction, role: "dialog", "aria-modal": "false", "aria-labelledby": titleId, children: [_jsxs("header", { className: css.drawerHeader, "data-dragging": drawerDragging || undefined, title: "\u957F\u6309\u62D6\u52A8 AWiki", onPointerDown: onDrawerPointerDown, onPointerMove: onDrawerPointerMove, onPointerUp: finishDrawerDrag, onPointerCancel: finishDrawerDrag, children: [_jsxs("div", { children: [registered ? (_jsx(Menu, { open: accountMenuOpen, onClose: () => { setAccountMenuOpen(false); }, align: "start", portal: true, compact: true, items: [{ id: 'logout', label: '退出登录', danger: true }], onSelect: () => {
                                            setAccountMenuOpen(false);
                                            setLogoutError(null);
                                            setLogoutOpen(true);
                                        }, anchor: (_jsx("button", { type: "button", "aria-label": "AWiki \u8D26\u6237\u83DC\u5355", "aria-expanded": accountMenuOpen, "aria-haspopup": "menu", onClick: () => { setAccountMenuOpen(value => !value); }, children: _jsx(IconGlobeOutline14, { size: 18 }) })) })) : _jsx(IconGlobeOutline14, { size: 18 }), _jsx("h2", { id: titleId, children: "AWiki" })] }), registered && (_jsx(Menu, { open: menuOpen, onClose: () => { setMenuOpen(false); }, align: "end", portal: true, compact: true, items: [{ id: 'direct', label: '发起私聊' }], onSelect: () => {
                                    setMenuOpen(false);
                                    setComposeDirect(true);
                                }, anchor: (_jsx("button", { type: "button", "aria-label": "\u53D1\u8D77\u4F1A\u8BDD", "aria-expanded": menuOpen, "aria-haspopup": "menu", onClick: () => { setMenuOpen(value => !value); }, children: _jsx(IconPlusOutline16, {}) })) })), _jsx("button", { type: "button", "aria-label": "\u5237\u65B0 AWiki", disabled: view.pending !== null, onClick: () => { void props.open(); }, children: _jsx(IconRefreshOutline16, {}) }), _jsx("button", { type: "button", "aria-label": "\u5173\u95ED AWiki", onClick: props.actions.close, children: _jsx(IconCloseOutline16, {}) })] }), view.status === 'loading' && _jsx("div", { className: css.centerState, role: "status", children: "\u6B63\u5728\u8FDE\u63A5 AWiki\u2026" }), view.status === 'error' && _jsxs("div", { className: css.centerState, children: [_jsx("p", { children: view.error }), _jsx("button", { type: "button", className: css.primary, onClick: () => { void props.open(); }, children: "\u91CD\u8BD5" })] }), view.status === 'ready' && view.sessionStatus === 'unregistered' && _jsx(Registration, { ...props, pending: view.pending !== null }), view.status === 'ready' && view.sessionStatus === 'signed-out' && _jsx(SignedOut, { login: props.login, pending: view.pending !== null }), view.status === 'ready' && view.sessionStatus === 'active' && view.identity !== null && (_jsx(Chat, { ...props, selectConversation: selectConversation, view: { ...view, identity: view.identity } })), composeDirect && (_jsx("div", { className: css.composeBackdrop, children: _jsxs("form", { className: css.composeCard, role: "dialog", "aria-modal": "true", "aria-labelledby": composeTitleId, onSubmit: (event) => { event.preventDefault(); void startDirect(); }, children: [_jsx("h3", { id: composeTitleId, children: "\u53D1\u8D77\u79C1\u804A" }), _jsx("p", { children: "\u8F93\u5165\u5BF9\u65B9 Handle\u3002\u6253\u5F00\u4F1A\u8BDD\u524D\u4F1A\u5148\u786E\u8BA4\u8BE5\u7528\u6237\u5B58\u5728\u3002" }), _jsxs("label", { children: ["Handle", _jsx("input", { value: peerHandle, onChange: (event) => { setPeerHandle(event.target.value); setComposeError(null); }, autoComplete: "off", placeholder: "\u4F8B\u5982 alice", autoFocus: true })] }), view.pending === '查找用户' && _jsx("p", { role: "status", children: "\u6B63\u5728\u67E5\u627E\u7528\u6237\u2026" }), composeError !== null && _jsx("p", { className: css.inlineError, role: "alert", children: composeError }), _jsxs("div", { className: css.composeActions, children: [_jsx("button", { type: "button", className: css.secondary, onClick: () => { setComposeDirect(false); setComposeError(null); }, children: "\u53D6\u6D88" }), _jsx("button", { type: "submit", className: css.primary, disabled: view.pending !== null || peerHandle.trim() === '', children: "\u6253\u5F00\u4F1A\u8BDD" })] })] }) })), _jsx(Modal, { open: logoutOpen, onClose: () => { if (!logoutPending)
                            setLogoutOpen(false); }, title: "\u9000\u51FA\u767B\u5F55", closeLabel: "\u53D6\u6D88", description: "\u9000\u51FA\u540E\uFF0C\u672C\u673A\u5C06\u6682\u505C\u4F7F\u7528 AWiki\uFF1B\u8EAB\u4EFD\u548C\u672C\u5730\u6570\u636E\u90FD\u4F1A\u4FDD\u7559\u3002", footer: (_jsxs(_Fragment, { children: [_jsx(Button, { type: "button", variant: "outline", disabled: logoutPending, onClick: () => { setLogoutOpen(false); }, children: "\u53D6\u6D88" }), _jsx(Button, { type: "button", variant: "outline", className: css.logoutConfirm, disabled: logoutPending, onClick: () => { void logout(); }, children: logoutPending ? '正在退出…' : '确认退出' })] })), children: _jsxs("div", { className: css.logoutWarning, children: [_jsx("p", { children: "\u9000\u51FA\u671F\u95F4\uFF0CWeb UI \u548C Agent \u90FD\u4E0D\u80FD\u8BFB\u53D6\u4F1A\u8BDD\u6216\u4F7F\u7528\u8BE5\u8EAB\u4EFD\u53D1\u9001\u6D88\u606F\u3002" }), _jsx("p", { children: "\u7A0D\u540E\u70B9\u51FB\u201C\u91CD\u65B0\u8FDB\u5165\u201D\u5373\u53EF\u7531\u672C\u673A Rust SDK \u6062\u590D\u540C\u4E00\u4E2A DID\u3001Handle \u548C\u6D88\u606F\u6570\u636E\u5E93\u3002" }), logoutError !== null && _jsx("p", { className: css.inlineError, role: "alert", children: logoutError })] }) }), view.error !== null && view.status !== 'error' && _jsx("div", { className: css.error, role: "alert", children: view.error }), view.pending !== null && view.pending !== '发送消息' && view.pending !== '发送附件' && view.pending !== '加载消息' && _jsxs("div", { className: css.pending, role: "status", children: [view.pending, "\u2026"] })] }))] }));
}
//# sourceMappingURL=AwikiOverlay.js.map