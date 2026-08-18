import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/** AWiki account, usage, and advanced settings contributed to DSH settings. */
import { useEffect, useState } from 'react';
import QRCode from 'qrcode/lib/browser.js';
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives';
import { AWIKI_DOMAIN_FIELD, DEFAULT_AWIKI_DOMAIN, normalizeAwikiDomain, } from "../domain.js";
import css from './AwikiSettingsSection.module.css';
function hasDomainOverride(snapshot) {
    return typeof snapshot.user === 'object'
        && snapshot.user !== null
        && !Array.isArray(snapshot.user)
        && Object.hasOwn(snapshot.user, AWIKI_DOMAIN_FIELD);
}
/** Render account controls, usage visibility, and existing advanced settings. */
export function AwikiSettingsSection(props) {
    const { t, useAwikiSettings, useAwikiModelProxy, useAwikiSession } = props;
    const settings = useAwikiSettings(value => value);
    const models = useAwikiModelProxy((value) => value);
    const identity = useAwikiSession((value) => value);
    const [tab, setTab] = useState('account');
    const sessionActive = identity.status === 'ready'
        && identity.sessionStatus === 'active'
        && identity.identity !== null;
    useEffect(() => {
        if (identity.status === 'cold')
            void props.identity.loadSession();
    }, [identity.status, props.identity]);
    useEffect(() => {
        if (sessionActive && models.status === 'idle')
            void props.models.load();
    }, [models.status, props.models, sessionActive]);
    useEffect(() => {
        if (sessionActive && tab === 'usage' && models.status === 'ready')
            void props.models.loadUsage();
    }, [models.status, props.models, sessionActive, tab]);
    return (_jsxs("section", { className: css.section, children: [_jsxs("div", { className: css.heading, children: [_jsx("h2", { className: css.title, children: t('nav') }), _jsx("p", { className: css.intro, children: t('intro') })] }), _jsxs("div", { className: css.tabs, role: "tablist", "aria-label": t('nav'), children: [_jsx(TabButton, { active: tab === 'account', onClick: () => { setTab('account'); }, children: t('tabAccount') }), _jsx(TabButton, { active: tab === 'usage', onClick: () => { setTab('usage'); }, children: t('tabUsage') }), _jsx(TabButton, { active: tab === 'advanced', onClick: () => { setTab('advanced'); }, children: t('tabAdvanced') })] }), tab === 'account' && (sessionActive
                ? _jsx(AccountPanel, { ...props, view: models })
                : _jsx(IdentityRequiredPanel, { ...props, view: identity })), tab === 'usage' && (sessionActive
                ? _jsx(UsagePanel, { ...props, view: models })
                : _jsx(IdentityRequiredPanel, { ...props, view: identity })), tab === 'advanced' && _jsx(AdvancedPanel, { ...props, settings: settings })] }));
}
function IdentityRequiredPanel(props) {
    const { t, view } = props;
    const [pending, setPending] = useState(false);
    const [error, setError] = useState(null);
    if (view.status === 'cold' || view.status === 'loading') {
        return _jsx("p", { className: css.status, children: t('identityLoading') });
    }
    if (view.status === 'error') {
        return _jsx("p", { className: `${css.notice} ${css.error}`, role: "alert", children: view.error ?? t('onboardingIdentityUnavailable') });
    }
    const restore = async () => {
        setPending(true);
        setError(null);
        const result = await props.identity.login();
        if (!result.ok)
            setError(result.error);
        setPending(false);
    };
    return (_jsxs("div", { className: css.panel, role: "tabpanel", children: [_jsx("p", { className: css.notice, children: view.sessionStatus === 'signed-out' ? t('identitySignedOutRequired') : t('identityRegistrationRequired') }), view.sessionStatus === 'signed-out' && (_jsx("div", { className: css.actions, children: _jsx(Button, { type: "button", disabled: pending, onClick: () => { void restore(); }, children: pending ? t('identityRestoring') : t('onboardingRestore') }) })), error !== null && _jsx("p", { className: `${css.status} ${css.error}`, role: "alert", children: error })] }));
}
function TabButton(props) {
    return (_jsx("button", { type: "button", role: "tab", "aria-selected": props.active, className: `${css.tab} ${props.active ? css.tabActive : ''}`, onClick: props.onClick, children: props.children }));
}
function AccountPanel(props) {
    const { t, view } = props;
    const account = view.account?.account;
    const [amount, setAmount] = useState('1.00');
    const [order, setOrder] = useState(null);
    const [qrDataUrl, setQrDataUrl] = useState(null);
    const [message, setMessage] = useState(null);
    useEffect(() => {
        if (order?.status !== 'pending')
            return;
        let stopped = false;
        let polling = false;
        const poll = async () => {
            if (polling)
                return;
            polling = true;
            try {
                const current = await props.models.rechargeStatus(order.out_trade_no);
                if (stopped)
                    return;
                setOrder(current);
                if (current.status === 'paid')
                    setMessage({ kind: 'saved', text: t('rechargePaid') });
                if (current.status === 'closed')
                    setMessage({ kind: 'error', text: t('rechargeClosed') });
            }
            catch (error) {
                if (!stopped)
                    setMessage({ kind: 'error', text: displayError(error, t('rechargeStatusFailed')) });
            }
            finally {
                polling = false;
            }
        };
        const timer = window.setInterval(() => { void poll(); }, 2_000);
        return () => { stopped = true; window.clearInterval(timer); };
    }, [order?.out_trade_no, order?.status, props.models, t]);
    const setEnabled = async (enabled) => {
        setMessage(null);
        try {
            await props.models.setEnabled(enabled);
            setMessage({ kind: 'saved', text: enabled ? t('modelsEnabled') : t('modelsDisabled') });
        }
        catch (error) {
            setMessage({ kind: 'error', text: displayError(error, t('modelActionFailed')) });
        }
    };
    const createRecharge = async (event) => {
        event.preventDefault();
        const cents = parseAmountCents(amount);
        if (cents === undefined) {
            setMessage({ kind: 'error', text: t('invalidRechargeAmount') });
            return;
        }
        setMessage(null);
        setOrder(null);
        setQrDataUrl(null);
        try {
            const created = await props.models.createRecharge(cents);
            setOrder(created);
            if (created.payment_action?.type === 'redirect_url') {
                if (!openPaymentUrl(created.payment_action.data))
                    throw new Error(t('paymentWindowFailed'));
            }
            else if (created.payment_action?.type === 'qr_code') {
                setQrDataUrl(await QRCode.toDataURL(created.payment_action.data, {
                    width: 220,
                    margin: 1,
                    errorCorrectionLevel: 'M',
                    color: { dark: '#111111ff', light: '#ffffffff' },
                }));
            }
            setMessage({ kind: 'saved', text: t('rechargeCreated') });
        }
        catch (error) {
            setMessage({ kind: 'error', text: displayError(error, t('rechargeFailed')) });
        }
    };
    if (view.status === 'idle' || view.status === 'loading')
        return _jsx("p", { className: css.status, children: t('modelAccountLoading') });
    if (view.status === 'unavailable' || account === undefined) {
        return _jsx("p", { className: `${css.notice} ${css.error}`, role: "alert", children: view.error ?? t('modelAccountUnavailable') });
    }
    return (_jsxs("div", { className: css.panel, role: "tabpanel", children: [_jsxs("dl", { className: css.accountSummary, children: [_jsxs("div", { children: [_jsx("dt", { children: t('accountBalance') }), _jsxs("dd", { children: [account.balance, " ", account.currency] })] }), _jsxs("div", { children: [_jsx("dt", { children: t('billingMode') }), _jsx("dd", { children: account.billing_mode === 'development_bypass' ? t('billingBypass') : t('billingStrict') })] }), _jsxs("div", { children: [_jsx("dt", { children: t('modelStatus') }), _jsx("dd", { children: view.account?.enabled ? t('statusEnabled') : t('statusDisabled') })] })] }), account.billing_mode === 'development_bypass' && _jsx("p", { className: css.notice, children: t('billingBypassNotice') }), !account.model_access_available && _jsx("p", { className: `${css.notice} ${css.error}`, children: t('modelAccessUnavailable') }), _jsx("div", { className: css.actions, children: _jsx(Button, { type: "button", disabled: view.pending !== null || (!view.account?.enabled && !account.model_access_available), onClick: () => { void setEnabled(view.account?.enabled !== true); }, children: view.pending === 'enable'
                        ? t('enablingModels')
                        : view.pending === 'disable'
                            ? t('disablingModels')
                            : view.account?.enabled ? t('disableModels') : t('enableModels') }) }), !account.payments_available ? (_jsx("p", { className: css.notice, children: t('paymentsUnavailable') })) : (_jsxs("form", { className: css.recharge, onSubmit: (event) => { void createRecharge(event); }, children: [_jsx("label", { className: css.label, htmlFor: "awiki-recharge-amount", children: t('rechargeAmount') }), _jsxs("div", { className: css.rechargeRow, children: [_jsx("input", { id: "awiki-recharge-amount", className: css.input, value: amount, disabled: view.pending !== null, inputMode: "decimal", autoComplete: "off", onChange: (event) => { setAmount(event.target.value); setMessage(null); } }), _jsx(Button, { type: "submit", disabled: view.pending !== null, children: view.pending === 'recharge' ? t('creatingRecharge') : t('createRecharge') })] })] })), qrDataUrl !== null && order?.status === 'pending' && (_jsxs("div", { className: css.qrPayment, children: [_jsx("img", { src: qrDataUrl, width: "220", height: "220", alt: t('paymentQrAlt') }), _jsx("p", { children: t('paymentQrHint') })] })), order !== null && (_jsx("p", { className: css.orderStatus, children: t('rechargeOrderStatus', { status: t(orderStatusKey(order.status)) }) })), _jsx("p", { className: `${css.status} ${message?.kind === 'error' ? css.error : ''}`, role: message?.kind === 'error' ? 'alert' : 'status', children: message?.text ?? view.error ?? '' })] }));
}
function UsagePanel(props) {
    const { t, view } = props;
    if (view.status === 'idle' || view.status === 'loading' || view.usageLoading) {
        return _jsx("p", { className: css.status, children: t('usageLoading') });
    }
    if (view.status === 'unavailable') {
        return _jsx("p", { className: `${css.notice} ${css.error}`, role: "alert", children: view.error ?? t('modelAccountUnavailable') });
    }
    return (_jsxs("div", { className: css.panel, role: "tabpanel", children: [_jsxs("div", { className: css.panelHeader, children: [_jsx("p", { className: css.description, children: t('usageDescription') }), _jsx(Button, { type: "button", variant: "outline", disabled: view.usageLoading, onClick: () => { void props.models.loadUsage(); }, children: t('reloadUsage') })] }), view.usage.length === 0 ? _jsx("p", { className: css.notice, children: t('usageEmpty') }) : (_jsx("div", { className: css.usageList, children: view.usage.map(item => _jsx(UsageRow, { item: item, t: t }, item.id)) })), view.error !== null && _jsx("p", { className: `${css.status} ${css.error}`, role: "alert", children: view.error })] }));
}
function UsageRow({ item, t }) {
    const tokens = item.cache_hit_tokens + item.cache_miss_tokens + item.completion_tokens;
    return (_jsxs("article", { className: css.usageRow, children: [_jsxs("div", { className: css.usageMain, children: [_jsx("strong", { children: item.model }), _jsx("span", { children: formatDate(item.created_at) })] }), _jsxs("dl", { className: css.usageMetrics, children: [_jsxs("div", { children: [_jsx("dt", { children: t('usageTokens') }), _jsx("dd", { children: tokens.toLocaleString() })] }), _jsxs("div", { children: [_jsx("dt", { children: t('usageCalculated') }), _jsx("dd", { children: item.calculated_cost_micros === null ? t('usageNoPrice') : formatMicros(item.calculated_cost_micros) })] }), _jsxs("div", { children: [_jsx("dt", { children: t('usageCharged') }), _jsx("dd", { children: formatMicros(item.charged_micros) })] })] })] }));
}
function AdvancedPanel(props) {
    const { t, settings } = props;
    const current = settings.value?.domain ?? DEFAULT_AWIKI_DOMAIN;
    const overridden = hasDomainOverride(settings);
    const [draft, setDraft] = useState(current);
    const [edited, setEdited] = useState(false);
    const [pending, setPending] = useState(false);
    const [status, setStatus] = useState(null);
    const [clearOpen, setClearOpen] = useState(false);
    const [clearDraft, setClearDraft] = useState('');
    const [clearing, setClearing] = useState(false);
    const [clearStatus, setClearStatus] = useState(null);
    useEffect(() => {
        if (!edited)
            setDraft(current);
    }, [current, edited]);
    if (settings.status === 'loading')
        return _jsx("p", { className: css.status, children: t('loading') });
    const unavailable = settings.status !== 'ready' || settings.mode !== 'host';
    const disabled = unavailable || !settings.writable || pending;
    const save = async (event) => {
        event?.preventDefault();
        let normalized;
        try {
            normalized = normalizeAwikiDomain(draft);
        }
        catch {
            setStatus({ kind: 'error', text: t('invalidDomain') });
            return;
        }
        setPending(true);
        setStatus(null);
        try {
            await props.saveDomain(normalized);
            setDraft(normalized);
            setEdited(false);
            setStatus({ kind: 'saved', text: `${t('saved')} ${t('restartNotice')}` });
        }
        catch {
            setStatus({ kind: 'error', text: t('saveFailed') });
        }
        finally {
            setPending(false);
        }
    };
    const reset = async () => {
        setPending(true);
        setStatus(null);
        try {
            await props.resetDomain();
            setEdited(false);
            setStatus({ kind: 'saved', text: `${t('saved')} ${t('restartNotice')}` });
        }
        catch {
            setStatus({ kind: 'error', text: t('saveFailed') });
        }
        finally {
            setPending(false);
        }
    };
    const closeClear = () => {
        if (clearing)
            return;
        setClearOpen(false);
        setClearDraft('');
    };
    const clearLocalData = async () => {
        if (clearDraft !== t('clearConfirmationPhrase'))
            return;
        setClearing(true);
        setClearStatus(null);
        try {
            await props.clearLocalData();
            setClearOpen(false);
            setClearDraft('');
            setClearStatus({ kind: 'saved', text: t('clearSucceeded') });
        }
        catch {
            setClearStatus({ kind: 'error', text: t('clearFailed') });
        }
        finally {
            setClearing(false);
        }
    };
    return (_jsxs("div", { className: css.panel, role: "tabpanel", children: [_jsxs("form", { className: css.card, onSubmit: (event) => { void save(event); }, children: [_jsx("label", { className: css.label, htmlFor: "awiki-default-domain", children: t('domainLabel') }), _jsx("p", { className: css.description, children: t('domainDescription') }), _jsx("input", { id: "awiki-default-domain", className: css.input, value: draft, disabled: disabled, spellCheck: false, autoCapitalize: "none", autoCorrect: "off", inputMode: "url", placeholder: DEFAULT_AWIKI_DOMAIN, onChange: (event) => { setDraft(event.target.value); setEdited(true); setStatus(null); } }), _jsx("p", { className: css.defaultValue, children: t('defaultValue', { domain: DEFAULT_AWIKI_DOMAIN }) }), _jsxs("div", { className: css.actions, children: [_jsx(Button, { type: "submit", disabled: disabled || !edited || draft.trim() === '', children: pending ? t('saving') : t('save') }), _jsx(Button, { type: "button", variant: "outline", disabled: disabled || !overridden, onClick: () => { void reset(); }, children: t('reset') })] }), unavailable
                        ? _jsx("p", { className: `${css.status} ${css.error}`, role: "alert", children: t('unavailable') })
                        : !settings.writable
                            ? _jsx("p", { className: `${css.status} ${css.error}`, role: "alert", children: t('readOnly') })
                            : _jsx("p", { className: `${css.status} ${status?.kind === 'error' ? css.error : ''}`, role: "status", children: status?.text ?? '' })] }), _jsx("p", { className: css.notice, children: t('identityNotice') }), _jsxs("section", { className: css.dangerZone, "aria-labelledby": "awiki-danger-zone-title", children: [_jsxs("div", { className: css.dangerCopy, children: [_jsx("h3", { id: "awiki-danger-zone-title", className: css.dangerTitle, children: t('dangerTitle') }), _jsx("p", { className: css.dangerDescription, children: t('dangerDescription') })] }), _jsx(Button, { type: "button", variant: "outline", className: css.dangerButton, disabled: unavailable || clearing, onClick: () => { setClearStatus(null); setClearOpen(true); }, children: t('clearLocalData') }), clearStatus?.kind === 'saved' && _jsx("p", { className: css.status, role: "status", children: clearStatus.text })] }), _jsxs(Modal, { open: clearOpen, onClose: closeClear, title: t('clearDialogTitle'), closeLabel: t('cancel'), description: t('clearDialogDescription'), className: css.clearDialog ?? '', footer: _jsxs(_Fragment, { children: [_jsx(Button, { type: "button", variant: "outline", disabled: clearing, onClick: closeClear, children: t('cancel') }), _jsx(Button, { type: "button", variant: "outline", className: css.clearConfirmButton, disabled: clearing || clearDraft !== t('clearConfirmationPhrase'), onClick: () => { void clearLocalData(); }, children: clearing ? t('clearing') : t('clearConfirm') })] }), children: [_jsxs("div", { className: css.clearWarning, children: [_jsx("p", { children: t('clearScope') }), _jsx("p", { children: t('clearRemoteNotice') })] }), _jsx("label", { className: css.confirmLabel, htmlFor: "awiki-clear-confirmation", children: t('clearConfirmationLabel', { phrase: t('clearConfirmationPhrase') }) }), _jsx("input", { id: "awiki-clear-confirmation", className: css.input, value: clearDraft, disabled: clearing, autoComplete: "off", spellCheck: false, autoFocus: true, onChange: (event) => { setClearDraft(event.target.value); } }), clearStatus?.kind === 'error' && _jsx("p", { className: `${css.status} ${css.error}`, role: "alert", children: clearStatus.text })] })] }));
}
function parseAmountCents(value) {
    const normalized = value.trim();
    if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/u.test(normalized))
        return undefined;
    const [yuan = '0', decimal = ''] = normalized.split('.');
    const cents = Number(yuan) * 100 + Number(decimal.padEnd(2, '0'));
    return Number.isSafeInteger(cents) && cents > 0 ? cents : undefined;
}
function openPaymentUrl(value) {
    try {
        const url = new URL(value);
        if (url.protocol !== 'https:')
            return false;
        return window.open(url.toString(), '_blank', 'noopener,noreferrer') !== null;
    }
    catch {
        return false;
    }
}
function formatMicros(value) {
    return `${(value / 1_000_000).toFixed(6)} CNY`;
}
function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(date);
}
function displayError(error, fallback) {
    return error instanceof Error && error.message !== '' ? error.message : fallback;
}
function orderStatusKey(status) {
    if (status === 'paid')
        return 'orderPaid';
    if (status === 'closed')
        return 'orderClosed';
    return 'orderPending';
}
export { hasDomainOverride, openPaymentUrl, parseAmountCents };
//# sourceMappingURL=AwikiSettingsSection.js.map