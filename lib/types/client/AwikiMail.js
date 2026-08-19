import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/** On-demand AWiki mailbox UI. Mail content is always rendered as untrusted text. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, IconChevronLeftOutline14, IconEditOutline16, IconFolderOpenOutline16, IconLoadingOutline16, IconPaperclipOutline16, IconRefreshOutline14, IconSendOutline16, IconWarningOutline16, Modal, } from '@deepseek-ai/dsh-client-ui-primitives';
import css from './AwikiMail.module.css';
const MAIL_NOTICE_AUTO_DISMISS_MS = 2_400;
function mailTime(value) {
    if (value === undefined)
        return '';
    const parsed = Date.parse(value);
    if (!Number.isFinite(parsed))
        return value;
    return new Intl.DateTimeFormat('zh-CN', {
        month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(parsed);
}
function participant(values, fallback) {
    return values.length === 0 ? fallback : values.join('、');
}
function splitAddresses(raw) {
    return raw.split(/[\s,，;；]+/u).map(value => value.trim()).filter(value => value !== '');
}
function utf8Bytes(value) {
    return new TextEncoder().encode(value).byteLength;
}
function validateDraft(toRaw, ccRaw, subjectRaw, bodyText) {
    const to = splitAddresses(toRaw);
    const cc = splitAddresses(ccRaw);
    if (to.length === 0)
        return { ok: false, error: '请至少填写一位收件人。' };
    if (to.length + cc.length > 20)
        return { ok: false, error: '收件人和抄送人合计不能超过 20 个。' };
    const recipients = [...to, ...cc];
    if (recipients.some(value => value.length < 3 || Array.from(value).length > 320 || !value.includes('@') || /\s/u.test(value))) {
        return { ok: false, error: '请检查收件人和抄送人的邮箱地址。' };
    }
    const canonical = recipients.map(value => value.toLocaleLowerCase());
    if (new Set(canonical).size !== canonical.length)
        return { ok: false, error: '收件人和抄送人不能重复。' };
    const subject = subjectRaw.trim();
    if (subject === '')
        return { ok: false, error: '请填写邮件主题。' };
    if (utf8Bytes(subject) > 1_024)
        return { ok: false, error: '邮件主题不能超过 1024 bytes。' };
    if (bodyText.trim() === '')
        return { ok: false, error: '请填写邮件正文。' };
    if (utf8Bytes(bodyText) > 65_536)
        return { ok: false, error: '邮件正文不能超过 65536 bytes。' };
    return { ok: true, value: { to, cc, subject, bodyText } };
}
function MailRow(props) {
    const from = participant(props.summary.from, '未知发件人');
    return (_jsxs("button", { type: "button", className: css.mailRow, "data-active": props.active || undefined, "data-unread": props.summary.unread || undefined, "aria-label": `${props.summary.unread ? '未读邮件' : '邮件'}：${props.summary.subject}，来自 ${from}`, onClick: props.onSelect, children: [_jsx("span", { className: css.unreadDot, "aria-hidden": "true" }), _jsxs("span", { className: css.rowContent, children: [_jsxs("span", { className: css.rowTop, children: [_jsx("strong", { children: from }), _jsx("time", { children: mailTime(props.summary.receivedAt ?? props.summary.sentAt) })] }), _jsx("span", { className: css.rowSubject, children: props.summary.subject || '（无主题）' }), _jsx("span", { className: css.rowPreview, children: props.summary.preview || '暂无纯文本预览' })] }), props.summary.hasAttachments && (_jsxs("span", { className: css.rowAttachment, "aria-label": `${props.summary.attachmentCount ?? 1} 个附件`, children: [_jsx(IconPaperclipOutline16, { size: 13 }), props.summary.attachmentCount !== undefined && _jsx("small", { children: props.summary.attachmentCount })] }))] }));
}
/** Render a persistent mail workspace; loading starts only after the user selects Mail. */
export function AwikiMail(props) {
    const [account, setAccount] = useState(null);
    const [items, setItems] = useState([]);
    const [nextOffset, setNextOffset] = useState();
    const [hasMore, setHasMore] = useState(false);
    const [listLoading, setListLoading] = useState(false);
    const [listError, setListError] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const [message, setMessage] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState(null);
    const [markingRead, setMarkingRead] = useState(false);
    const [compose, setCompose] = useState(false);
    const [to, setTo] = useState('');
    const [cc, setCc] = useState('');
    const [subject, setSubject] = useState('');
    const [bodyText, setBodyText] = useState('');
    const [composeError, setComposeError] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [discardOpen, setDiscardOpen] = useState(false);
    const [sending, setSending] = useState(false);
    const [notice, setNotice] = useState(null);
    const [pane, setPane] = useState('folders');
    const loaded = useRef(false);
    const loadGeneration = useRef(0);
    const detailGeneration = useRef(0);
    const lastRefreshRevision = useRef(props.refreshRevision);
    const noticeRevision = useRef(0);
    const unreadCount = useMemo(() => items.reduce((total, item) => total + (item.unread ? 1 : 0), 0), [items]);
    useEffect(() => { props.onUnreadCountChange(unreadCount); }, [props.onUnreadCountChange, unreadCount]);
    const showNotice = (text) => {
        noticeRevision.current += 1;
        setNotice({ id: noticeRevision.current, text });
    };
    useEffect(() => {
        if (notice === null)
            return;
        const timer = window.setTimeout(() => {
            setNotice(current => current?.id === notice.id ? null : current);
        }, MAIL_NOTICE_AUTO_DISMISS_MS);
        return () => { window.clearTimeout(timer); };
    }, [notice]);
    const refresh = async () => {
        const generation = ++loadGeneration.current;
        setListLoading(true);
        setListError(null);
        setNotice(null);
        const [accountResult, inboxResult] = await Promise.all([
            props.getMailAccount(),
            props.listMailInbox({ folder: 'inbox', unreadOnly: false, limit: 20, offset: 0 }),
        ]);
        if (generation !== loadGeneration.current)
            return;
        setListLoading(false);
        if (!accountResult.ok || !inboxResult.ok) {
            setListError(!accountResult.ok ? accountResult.error : inboxResult.ok ? null : inboxResult.error);
            return;
        }
        setAccount(accountResult.value);
        setItems(inboxResult.value.items);
        setNextOffset(inboxResult.value.nextOffset);
        setHasMore(inboxResult.value.hasMore && inboxResult.value.nextOffset !== undefined);
        if (selectedId !== null && !inboxResult.value.items.some(item => item.id === selectedId)) {
            setSelectedId(null);
            setMessage(null);
        }
    };
    useEffect(() => {
        if (!props.active || loaded.current)
            return;
        loaded.current = true;
        setPane('list');
        void refresh();
    }, [props.active]);
    useEffect(() => {
        if (!props.active || props.refreshRevision === lastRefreshRevision.current)
            return;
        lastRefreshRevision.current = props.refreshRevision;
        void refresh();
    }, [props.active, props.refreshRevision]);
    const startCompose = () => {
        detailGeneration.current += 1;
        setCompose(true);
        setSelectedId(null);
        setMessage(null);
        setComposeError(null);
        setNotice(null);
        setPane('detail');
    };
    const selectMail = async (summary) => {
        const generation = ++detailGeneration.current;
        setCompose(false);
        setSelectedId(summary.id);
        setMessage(null);
        setDetailLoading(true);
        setDetailError(null);
        setNotice(null);
        setPane('detail');
        const requestedId = summary.id;
        const result = await props.readMail({ messageId: requestedId });
        if (generation !== detailGeneration.current)
            return;
        setDetailLoading(false);
        if (!result.ok) {
            setDetailError(result.error);
            return;
        }
        setMessage(result.value);
    };
    const loadMore = async () => {
        if (!hasMore || nextOffset === undefined || listLoading)
            return;
        setListLoading(true);
        setListError(null);
        const result = await props.listMailInbox({
            folder: 'inbox', unreadOnly: false, limit: 20, offset: nextOffset,
        });
        setListLoading(false);
        if (!result.ok) {
            setListError(result.error);
            return;
        }
        const existing = new Set(items.map(item => item.id));
        setItems([...items, ...result.value.items.filter(item => !existing.has(item.id))]);
        setNextOffset(result.value.nextOffset);
        setHasMore(result.value.hasMore && result.value.nextOffset !== undefined);
    };
    const markRead = async () => {
        if (message === null || !message.summary.unread || markingRead)
            return;
        setMarkingRead(true);
        setDetailError(null);
        const result = await props.markMailRead({ messageIds: [message.summary.id] });
        setMarkingRead(false);
        if (!result.ok) {
            setDetailError(result.error);
            return;
        }
        setMessage({ ...message, summary: { ...message.summary, unread: false } });
        setItems(current => current.map(item => item.id === message.summary.id ? { ...item, unread: false } : item));
        showNotice(result.value.updated > 0 ? '已标为已读。' : '该邮件已经是已读状态。');
    };
    const requestSend = () => {
        const validated = validateDraft(to, cc, subject, bodyText);
        if (!validated.ok) {
            setComposeError(validated.error);
            return;
        }
        setComposeError(null);
        setConfirmOpen(true);
    };
    const clearDraft = () => {
        setTo('');
        setCc('');
        setSubject('');
        setBodyText('');
        setComposeError(null);
    };
    const confirmSend = async () => {
        const validated = validateDraft(to, cc, subject, bodyText);
        if (!validated.ok) {
            setConfirmOpen(false);
            setComposeError(validated.error);
            return;
        }
        setSending(true);
        const request = {
            to: validated.value.to,
            cc: validated.value.cc,
            subject: validated.value.subject,
            bodyText: validated.value.bodyText,
        };
        const result = await props.sendMail(request);
        setSending(false);
        setConfirmOpen(false);
        if (!result.ok) {
            setComposeError(result.error);
            return;
        }
        if (!result.value.accepted) {
            setComposeError('邮件服务没有接受本次发送，请检查内容后重试。');
            return;
        }
        const warningText = result.value.warnings.length === 0 ? '' : `，服务返回 ${result.value.warnings.length} 条提示`;
        showNotice(`邮件已发送${warningText}。`);
        clearDraft();
        setCompose(false);
        setPane('list');
    };
    const dirty = to.trim() !== '' || cc.trim() !== '' || subject.trim() !== '' || bodyText.trim() !== '';
    const cancelCompose = () => {
        if (dirty) {
            setDiscardOpen(true);
            return;
        }
        setCompose(false);
        setPane('list');
    };
    const selectedSummary = items.find(item => item.id === selectedId);
    return (_jsxs("div", { className: css.mail, "data-pane": pane, "data-detail-active": compose || selectedId !== null || undefined, children: [_jsxs("aside", { className: css.sidebar, "aria-label": "\u90AE\u7BB1\u5BFC\u822A", children: [props.identityCard, props.modeTabs, _jsxs("div", { className: css.accountCard, children: [_jsx("small", { children: "\u90AE\u7BB1\u8D26\u53F7" }), _jsx("strong", { children: account?.displayName ?? account?.mailboxAddress ?? (listLoading ? '正在加载…' : '暂不可用') }), account?.mailboxAddress !== undefined && account.displayName !== undefined && _jsx("span", { children: account.mailboxAddress }), account?.status !== undefined && _jsx("span", { className: css.accountStatus, children: account.status })] }), _jsx("nav", { className: css.folderNav, "aria-label": "\u90AE\u4EF6\u6587\u4EF6\u5939", children: _jsxs("button", { type: "button", "data-active": true, onClick: () => { setPane('list'); }, children: [_jsx(IconFolderOpenOutline16, { size: 16 }), _jsx("span", { children: "\u6536\u4EF6\u7BB1" }), unreadCount > 0 && _jsx("small", { children: unreadCount > 99 ? '99+' : unreadCount })] }) }), _jsxs("button", { type: "button", className: css.composeButton, onClick: startCompose, children: [_jsx(IconEditOutline16, { size: 16 }), "\u5199\u90AE\u4EF6"] })] }), _jsxs("section", { className: css.mailList, "aria-label": "\u6536\u4EF6\u7BB1", children: [_jsxs("header", { className: css.listHeader, children: [_jsx("button", { type: "button", className: css.mobileBack, "aria-label": "\u8FD4\u56DE\u90AE\u7BB1\u5BFC\u822A", onClick: () => { setPane('folders'); }, children: _jsx(IconChevronLeftOutline14, { size: 14 }) }), _jsxs("div", { children: [_jsx("strong", { children: "\u6536\u4EF6\u7BB1" }), _jsxs("small", { children: [items.length, " \u5C01\u90AE\u4EF6", unreadCount > 0 ? ` · ${unreadCount} 封未读` : ''] })] }), _jsx("button", { type: "button", "aria-label": "\u5237\u65B0\u6536\u4EF6\u7BB1", disabled: listLoading, onClick: () => { void refresh(); }, children: listLoading ? _jsx(IconLoadingOutline16, { size: 15 }) : _jsx(IconRefreshOutline14, { size: 15 }) })] }), listError !== null && _jsxs("div", { className: css.inlineError, role: "alert", children: [listError, _jsx("button", { type: "button", onClick: () => { void refresh(); }, children: "\u91CD\u8BD5" })] }), _jsxs("div", { className: css.rows, children: [items.map(item => (_jsx(MailRow, { summary: item, active: item.id === selectedId, onSelect: () => { void selectMail(item); } }, item.id))), items.length === 0 && !listLoading && listError === null && (_jsxs("div", { className: css.emptyState, children: [_jsx(IconFolderOpenOutline16, { size: 26 }), _jsx("p", { children: "\u6536\u4EF6\u7BB1\u91CC\u8FD8\u6CA1\u6709\u90AE\u4EF6\u3002" })] }))] }), listLoading && items.length === 0 && _jsxs("div", { className: css.loadingState, role: "status", children: [_jsx(IconLoadingOutline16, { size: 18 }), "\u6B63\u5728\u52A0\u8F7D\u90AE\u4EF6\u2026"] }), hasMore && _jsx("button", { type: "button", className: css.loadMore, disabled: listLoading, onClick: () => { void loadMore(); }, children: listLoading ? '正在加载…' : '加载更多邮件' })] }), _jsx("section", { className: css.mailDetail, "aria-label": compose ? '写邮件' : '邮件详情', children: compose ? (_jsxs("form", { className: css.composer, onSubmit: (event) => { event.preventDefault(); requestSend(); }, children: [_jsxs("header", { className: css.detailHeader, children: [_jsx("button", { type: "button", className: css.detailBack, "aria-label": "\u8FD4\u56DE\u6536\u4EF6\u7BB1", onClick: cancelCompose, children: _jsx(IconChevronLeftOutline14, { size: 14 }) }), _jsxs("div", { children: [_jsx("strong", { children: "\u5199\u90AE\u4EF6" }), _jsx("small", { children: "\u53D1\u9001\u7EAF\u6587\u672C\u90AE\u4EF6" })] })] }), _jsxs("div", { className: css.composeFields, children: [_jsxs("label", { children: ["\u6536\u4EF6\u4EBA", _jsx("textarea", { value: to, rows: 2, autoFocus: true, placeholder: "alice@example.com\uFF0C\u53EF\u7528\u9017\u53F7\u6216\u6362\u884C\u5206\u9694", onChange: (event) => { setTo(event.target.value); setComposeError(null); } })] }), _jsxs("label", { children: ["\u6284\u9001", _jsx("textarea", { value: cc, rows: 1, placeholder: "\u9009\u586B", onChange: (event) => { setCc(event.target.value); setComposeError(null); } })] }), _jsxs("label", { children: ["\u4E3B\u9898", _jsx("input", { value: subject, placeholder: "\u90AE\u4EF6\u4E3B\u9898", onChange: (event) => { setSubject(event.target.value); setComposeError(null); } })] }), _jsxs("label", { className: css.bodyField, children: ["\u6B63\u6587", _jsx("textarea", { value: bodyText, placeholder: "\u8F93\u5165\u7EAF\u6587\u672C\u90AE\u4EF6\u6B63\u6587", onChange: (event) => { setBodyText(event.target.value); setComposeError(null); } })] }), composeError !== null && _jsx("p", { className: css.composeError, role: "alert", children: composeError })] }), _jsxs("footer", { className: css.composeFooter, children: [_jsx("button", { type: "button", className: css.cancelButton, disabled: sending, onClick: cancelCompose, children: "\u53D6\u6D88" }), _jsxs("button", { type: "submit", className: css.sendButton, disabled: sending, children: [_jsx(IconSendOutline16, { size: 15 }), "\u53D1\u9001"] })] })] })) : selectedId === null ? (_jsxs("div", { className: css.detailEmpty, children: [_jsx(IconFolderOpenOutline16, { size: 32 }), _jsx("p", { children: "\u9009\u62E9\u4E00\u5C01\u90AE\u4EF6\u67E5\u770B\u5185\u5BB9\u3002" }), _jsx("button", { type: "button", onClick: startCompose, children: "\u5199\u90AE\u4EF6" })] })) : (_jsxs(_Fragment, { children: [_jsxs("header", { className: css.detailHeader, children: [_jsx("button", { type: "button", className: css.detailBack, "aria-label": "\u8FD4\u56DE\u6536\u4EF6\u7BB1", onClick: () => { setSelectedId(null); setMessage(null); setPane('list'); }, children: _jsx(IconChevronLeftOutline14, { size: 14 }) }), _jsxs("div", { children: [_jsx("strong", { children: selectedSummary?.subject ?? '邮件详情' }), _jsx("small", { children: selectedSummary === undefined ? '' : participant(selectedSummary.from, '未知发件人') })] }), message?.summary.unread === true && _jsx("button", { type: "button", className: css.markReadButton, disabled: markingRead, onClick: () => { void markRead(); }, children: markingRead ? '处理中…' : '标为已读' })] }), detailLoading && _jsxs("div", { className: css.loadingState, role: "status", children: [_jsx(IconLoadingOutline16, { size: 18 }), "\u6B63\u5728\u8BFB\u53D6\u90AE\u4EF6\u2026"] }), detailError !== null && _jsx("div", { className: css.detailError, role: "alert", children: detailError }), message !== null && (_jsxs("article", { className: css.messageBody, children: [_jsxs("div", { className: css.messageMeta, children: [_jsx("h3", { children: message.summary.subject || '（无主题）' }), _jsx("time", { children: mailTime(message.summary.receivedAt ?? message.summary.sentAt) }), _jsxs("dl", { children: [_jsxs("div", { children: [_jsx("dt", { children: "\u53D1\u4EF6\u4EBA" }), _jsx("dd", { children: participant(message.summary.from, '未知发件人') })] }), _jsxs("div", { children: [_jsx("dt", { children: "\u6536\u4EF6\u4EBA" }), _jsx("dd", { children: participant(message.summary.to, '未提供') })] }), message.summary.cc.length > 0 && _jsxs("div", { children: [_jsx("dt", { children: "\u6284\u9001" }), _jsx("dd", { children: participant(message.summary.cc, '') })] })] })] }), _jsxs("div", { className: css.untrustedNotice, children: [_jsx(IconWarningOutline16, { size: 15 }), "\u90AE\u4EF6\u5185\u5BB9\u6765\u81EA\u5916\u90E8\uFF0C\u4EC5\u6309\u7EAF\u6587\u672C\u663E\u793A\u3002"] }), _jsx("div", { className: css.plainBody, children: message.bodyText ?? (message.hasHtmlBody ? '这封邮件仅包含 HTML 内容，出于安全原因未直接显示。' : '这封邮件没有可显示的纯文本正文。') }), message.bodyTruncated && _jsx("p", { className: css.truncatedNotice, children: "\u6B63\u6587\u5185\u5BB9\u5DF2\u7531\u670D\u52A1\u7AEF\u622A\u65AD\u3002" }), message.attachments.length > 0 && (_jsxs("section", { className: css.attachments, "aria-label": "\u9644\u4EF6\u5143\u6570\u636E", children: [_jsx("h4", { children: "\u9644\u4EF6\uFF08\u4EC5\u5143\u6570\u636E\uFF09" }), message.attachments.map(attachment => (_jsxs("div", { children: [_jsx(IconPaperclipOutline16, { size: 15 }), _jsxs("span", { children: [_jsx("strong", { children: attachment.fileName ?? `附件 ${attachment.index + 1}` }), _jsx("small", { children: [attachment.contentType, attachment.sizeBytes === undefined ? undefined : `${attachment.sizeBytes} bytes`].filter(Boolean).join(' · ') || '暂无更多信息' })] })] }, attachment.index)))] }))] }))] })) }), notice !== null && (_jsx("div", { className: css.notice, role: "status", "aria-live": "polite", "aria-atomic": "true", onAnimationEnd: () => {
                    setNotice(current => current?.id === notice.id ? null : current);
                }, children: notice.text }, notice.id)), _jsx(Modal, { open: confirmOpen, onClose: () => { if (!sending)
                    setConfirmOpen(false); }, title: "\u786E\u8BA4\u53D1\u9001\u90AE\u4EF6", closeLabel: "\u53D6\u6D88", description: "\u90AE\u4EF6\u5C06\u901A\u8FC7\u5F53\u524D AWiki \u8EAB\u4EFD\u53D1\u9001\u4E00\u6B21\uFF0C\u5931\u8D25\u540E\u4E0D\u4F1A\u81EA\u52A8\u91CD\u8BD5\u3002", footer: _jsxs(_Fragment, { children: [_jsx(Button, { type: "button", variant: "outline", disabled: sending, onClick: () => { setConfirmOpen(false); }, children: "\u8FD4\u56DE\u4FEE\u6539" }), _jsx(Button, { type: "button", disabled: sending, onClick: () => { void confirmSend(); }, children: sending ? '正在发送…' : '确认发送' })] }), children: _jsxs("div", { className: css.confirmSummary, children: [_jsxs("p", { children: ["\u6536\u4EF6\u4EBA\uFF1A", splitAddresses(to).length, " \u4EBA"] }), _jsxs("p", { children: ["\u6284\u9001\uFF1A", splitAddresses(cc).length, " \u4EBA"] }), _jsxs("p", { children: ["\u4E3B\u9898\uFF1A", subject.trim()] })] }) }), _jsx(Modal, { open: discardOpen, onClose: () => { setDiscardOpen(false); }, title: "\u653E\u5F03\u8FD9\u5C01\u90AE\u4EF6\uFF1F", closeLabel: "\u7EE7\u7EED\u7F16\u8F91", description: "\u9996\u7248\u4E0D\u4F1A\u4FDD\u5B58\u8349\u7A3F\uFF0C\u653E\u5F03\u540E\u5F53\u524D\u5185\u5BB9\u5C06\u88AB\u6E05\u7A7A\u3002", footer: _jsxs(_Fragment, { children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => { setDiscardOpen(false); }, children: "\u7EE7\u7EED\u7F16\u8F91" }), _jsx(Button, { type: "button", variant: "outline", onClick: () => { setDiscardOpen(false); clearDraft(); setCompose(false); setPane('list'); }, children: "\u786E\u8BA4\u653E\u5F03" })] }), children: _jsx("p", { className: css.discardText, children: "\u6536\u4EF6\u4EBA\u3001\u4E3B\u9898\u548C\u6B63\u6587\u4E2D\u7684\u672A\u53D1\u9001\u5185\u5BB9\u90FD\u4F1A\u4E22\u5931\u3002" }) })] }));
}
//# sourceMappingURL=AwikiMail.js.map