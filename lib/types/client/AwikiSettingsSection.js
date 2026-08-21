import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/** AWiki account, usage, and advanced settings contributed to DSH settings. */
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode/lib/browser.js';
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives';
import { AWIKI_DOMAIN_FIELD, DEFAULT_AWIKI_DOMAIN, normalizeAwikiDomain, } from "../domain.js";
import { RechargeComingSoonDialog } from "./RechargeComingSoonDialog.js";
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
    const modelProxyAvailable = models.capability === 'available';
    const activeTab = modelProxyAvailable ? tab : 'advanced';
    useEffect(() => {
        if (identity.status === 'cold')
            void props.identity.loadSession();
    }, [identity.status, props.identity]);
    useEffect(() => {
        if (sessionActive)
            void props.models.load();
    }, [props.models, sessionActive]);
    useEffect(() => {
        if (sessionActive && tab === 'usage' && models.status === 'ready')
            void props.models.loadUsage();
    }, [models.status, props.models, sessionActive, tab]);
    return (_jsxs("section", { className: css.section, children: [_jsxs("div", { className: css.heading, children: [_jsx("h2", { className: css.title, children: t('nav') }), _jsx("p", { className: css.intro, children: t('intro') })] }), _jsxs("div", { className: css.tabs, role: "tablist", "aria-label": t('nav'), children: [modelProxyAvailable && _jsx(TabButton, { active: activeTab === 'account', onClick: () => { setTab('account'); }, children: t('tabAccount') }), modelProxyAvailable && _jsx(TabButton, { active: activeTab === 'usage', onClick: () => { setTab('usage'); }, children: t('tabUsage') }), _jsx(TabButton, { active: activeTab === 'advanced', onClick: () => { setTab('advanced'); }, children: t('tabAdvanced') })] }), activeTab === 'account' && (sessionActive
                ? _jsx(AccountPanel, { ...props, view: models })
                : _jsx(IdentityRequiredPanel, { ...props, view: identity })), activeTab === 'usage' && (sessionActive
                ? _jsx(UsagePanel, { ...props, view: models })
                : _jsx(IdentityRequiredPanel, { ...props, view: identity })), activeTab === 'advanced' && _jsx(AdvancedPanel, { ...props, settings: settings })] }));
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
    return (_jsxs("div", { className: css.panel, role: "tabpanel", children: [_jsx("p", { className: css.notice, children: view.sessionStatus === 'recovery-required'
                    ? t('identityRecoveryRequired')
                    : view.sessionStatus === 'signed-out'
                        ? t('identitySignedOutRequired')
                        : t('identityRegistrationRequired') }), view.sessionStatus === 'signed-out' && (_jsx("div", { className: css.actions, children: _jsx(Button, { type: "button", disabled: pending, onClick: () => { void restore(); }, children: pending ? t('identityRestoring') : t('onboardingRestore') }) })), error !== null && _jsx("p", { className: `${css.status} ${css.error}`, role: "alert", children: error })] }));
}
function TabButton(props) {
    return (_jsx("button", { type: "button", role: "tab", "aria-selected": props.active, className: `${css.tab} ${props.active ? css.tabActive : ''}`, onClick: props.onClick, children: props.children }));
}
function AccountPanel(props) {
    const { t, view } = props;
    const account = view.account?.account;
    const [amount, setAmount] = useState('1.00');
    const [qrDataUrl, setQrDataUrl] = useState(null);
    const [refreshingPayment, setRefreshingPayment] = useState(false);
    const [cancelRechargeOpen, setCancelRechargeOpen] = useState(false);
    const [rechargeComingSoonOpen, setRechargeComingSoonOpen] = useState(false);
    const [focusRechargeAmount, setFocusRechargeAmount] = useState(false);
    const [message, setMessage] = useState(null);
    const amountInput = useRef(null);
    const order = props.rechargeEnabled ? view.account?.pending_recharge_order ?? null : null;
    const cancellingRecharge = view.pending === 'close-recharge';
    const paymentBusy = refreshingPayment || view.pending !== null;
    useEffect(() => {
        let stopped = false;
        setQrDataUrl(null);
        if (order?.status !== 'pending' || order.payment_action?.type !== 'qr_code')
            return;
        void QRCode.toDataURL(order.payment_action.data, {
            width: 220,
            margin: 1,
            errorCorrectionLevel: 'M',
            color: { dark: '#111111ff', light: '#ffffffff' },
        }).then((value) => {
            if (!stopped)
                setQrDataUrl(value);
        }).catch(() => {
            if (!stopped)
                setMessage({ kind: 'error', text: t('paymentQrFailed') });
        });
        return () => { stopped = true; };
    }, [order?.out_trade_no, order?.payment_action?.data, order?.payment_action?.type, order?.status, t]);
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
    useEffect(() => {
        if (order !== null)
            return;
        setCancelRechargeOpen(false);
        if (!focusRechargeAmount)
            return;
        amountInput.current?.focus();
        amountInput.current?.select();
        setFocusRechargeAmount(false);
    }, [focusRechargeAmount, order]);
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
        if (!props.rechargeEnabled) {
            setMessage(null);
            setRechargeComingSoonOpen(true);
            return;
        }
        const cents = parseAmountCents(amount);
        if (cents === undefined) {
            setMessage({ kind: 'error', text: t('invalidRechargeAmount') });
            return;
        }
        setMessage(null);
        try {
            const created = await props.models.createRecharge(cents);
            if (created.payment_action?.type === 'redirect_url') {
                if (!openPaymentUrl(created.payment_action.data))
                    throw new Error(t('paymentWindowFailed'));
            }
            setMessage({ kind: 'saved', text: t('rechargeCreated') });
        }
        catch (error) {
            setMessage({ kind: 'error', text: displayError(error, t('rechargeFailed')) });
        }
    };
    const refreshPayment = async () => {
        if (order === null || refreshingPayment)
            return;
        setRefreshingPayment(true);
        setMessage(null);
        try {
            const current = await props.models.rechargeStatus(order.out_trade_no);
            if (current.status === 'paid')
                setMessage({ kind: 'saved', text: t('rechargePaid') });
            if (current.status === 'closed')
                setMessage({ kind: 'error', text: t('rechargeClosed') });
        }
        catch (error) {
            setMessage({ kind: 'error', text: displayError(error, t('rechargeStatusFailed')) });
        }
        finally {
            setRefreshingPayment(false);
        }
    };
    const continuePayment = () => {
        if (order?.payment_action?.type !== 'redirect_url'
            || !openPaymentUrl(order.payment_action.data)) {
            setMessage({ kind: 'error', text: t('paymentWindowFailed') });
        }
    };
    const closeCancelRecharge = () => {
        if (!cancellingRecharge)
            setCancelRechargeOpen(false);
    };
    const cancelRecharge = async () => {
        if (order === null || cancellingRecharge)
            return;
        const amountCents = order.amount_cents;
        setMessage(null);
        try {
            const outcome = await props.models.closeRecharge(order.out_trade_no);
            setCancelRechargeOpen(false);
            if (outcome === 'paid') {
                setMessage({ kind: 'saved', text: t('rechargePaid') });
                return;
            }
            setAmount((amountCents / 100).toFixed(2));
            setFocusRechargeAmount(true);
            setMessage({ kind: 'saved', text: t('rechargeCancelled') });
        }
        catch {
            setMessage({ kind: 'error', text: t('rechargeCancelFailed') });
        }
    };
    if ((view.status === 'idle' || view.status === 'loading') && account === undefined) {
        return _jsx("p", { className: css.status, children: t('modelAccountLoading') });
    }
    if (view.status === 'unavailable' || account === undefined) {
        return _jsx("p", { className: `${css.notice} ${css.error}`, role: "alert", children: view.error ?? t('modelAccountUnavailable') });
    }
    return (_jsxs("div", { className: css.panel, role: "tabpanel", children: [_jsxs("dl", { className: `${css.accountSummary} ${account.billing_mode === 'development_bypass' ? css.accountSummaryDevelopment : ''}`, children: [_jsxs("div", { children: [_jsx("dt", { children: t('accountBalance') }), _jsxs("dd", { children: [account.balance, " ", account.currency] })] }), _jsxs("div", { children: [_jsx("dt", { children: t('modelStatus') }), _jsx("dd", { children: view.account?.enabled ? t('statusEnabled') : t('statusDisabled') })] }), account.billing_mode === 'development_bypass' && _jsxs("div", { children: [_jsx("dt", { children: t('billingMode') }), _jsx("dd", { children: t('billingBypass') })] })] }), account.billing_mode === 'development_bypass' && _jsx("p", { className: `${css.notice} ${css.developmentNotice}`, children: t('billingBypassNotice') }), !account.model_access_available && (_jsxs("div", { className: `${css.notice} ${css.accessNotice}`, role: "status", children: [_jsx("strong", { children: account.model_access_reason === 'insufficient_balance' ? t('insufficientBalanceTitle') : t('modelAccessUnavailableTitle') }), _jsx("span", { children: account.model_access_reason === 'insufficient_balance' ? t('insufficientBalanceDescription') : t('modelAccessUnavailable') })] })), account.model_access_available && (_jsx("div", { className: css.actions, children: _jsx(Button, { type: "button", ...view.account?.enabled ? { variant: 'outline' } : {}, disabled: view.pending !== null || view.status === 'loading', onClick: () => { void setEnabled(view.account?.enabled !== true); }, children: view.pending === 'enable'
                        ? t('enablingModels')
                        : view.pending === 'disable'
                            ? t('disablingModels')
                            : view.account?.enabled ? t('disableModels') : t('enableModels') }) })), order !== null ? (_jsxs("section", { className: css.paymentPanel, "aria-labelledby": "awiki-pending-recharge-title", children: [_jsxs("div", { className: css.paymentHeader, children: [_jsxs("div", { children: [_jsx("h3", { id: "awiki-pending-recharge-title", children: t('pendingRechargeTitle') }), _jsx("p", { children: t('pendingRechargeDescription', { amount: formatCents(order.amount_cents) }) })] }), _jsx("span", { className: css.paymentStatus, children: t('orderPending') })] }), qrDataUrl !== null && (_jsxs("div", { className: css.qrPayment, children: [_jsx("img", { src: qrDataUrl, width: "220", height: "220", alt: t('paymentQrAlt') }), _jsx("p", { children: t('paymentQrHint') })] })), _jsxs("div", { className: css.actions, children: [order.payment_action?.type === 'redirect_url' && (_jsx(Button, { type: "button", disabled: paymentBusy, onClick: continuePayment, children: t('continuePayment') })), _jsx(Button, { type: "button", ...order.payment_action?.type === 'redirect_url' ? { variant: 'outline' } : {}, disabled: paymentBusy, onClick: () => { void refreshPayment(); }, children: refreshingPayment ? t('refreshingPaymentStatus') : t('refreshPaymentStatus') }), _jsx(Button, { type: "button", variant: "outline", disabled: paymentBusy, onClick: () => { setMessage(null); setCancelRechargeOpen(true); }, children: t('changeRechargeAmount') })] }), _jsx("p", { className: css.orderStatus, children: t('pendingRechargeLimit') })] })) : props.rechargeEnabled && !account.payments_available ? (_jsx("p", { className: css.notice, children: t('paymentsUnavailable') })) : (_jsxs("form", { className: css.recharge, onSubmit: (event) => { void createRecharge(event); }, children: [_jsx("label", { className: css.label, htmlFor: "awiki-recharge-amount", children: t('rechargeAmount') }), _jsxs("div", { className: css.rechargeRow, children: [_jsx("input", { id: "awiki-recharge-amount", ref: amountInput, className: css.input, value: amount, disabled: view.pending !== null, inputMode: "decimal", autoComplete: "off", onChange: (event) => { setAmount(event.target.value); setMessage(null); } }), _jsx(Button, { type: "submit", ...account.model_access_available ? { variant: 'outline' } : {}, disabled: view.pending !== null || view.status === 'loading', children: view.pending === 'recharge' ? t('creatingRecharge') : t('createRecharge') })] })] })), _jsx("p", { className: `${css.status} ${message?.kind === 'error' ? css.error : ''}`, role: message?.kind === 'error' ? 'alert' : 'status', children: message?.text ?? view.error ?? '' }), _jsx(Modal, { open: cancelRechargeOpen && order !== null, onClose: closeCancelRecharge, title: t('cancelRechargeDialogTitle'), closeLabel: t('cancel'), description: t('cancelRechargeDialogDescription', { amount: formatCents(order?.amount_cents ?? 0) }), className: `${css.clearDialog ?? ''} ${css.compactModal ?? ''}`, contentClassName: css.compactModalContent ?? '', footer: _jsxs(_Fragment, { children: [_jsx(Button, { type: "button", variant: "outline", disabled: cancellingRecharge, onClick: closeCancelRecharge, children: t('cancel') }), _jsx(Button, { type: "button", variant: "outline", className: css.cancelRechargeConfirm, disabled: cancellingRecharge, onClick: () => { void cancelRecharge(); }, children: cancellingRecharge ? t('cancellingRecharge') : t('confirmCancelRecharge') })] }), children: _jsx("p", { className: css.cancelRechargeWarning, children: t('cancelRechargeWarning') }) }), _jsx(RechargeComingSoonDialog, { open: rechargeComingSoonOpen, onClose: () => { setRechargeComingSoonOpen(false); }, t: t })] }));
}
function UsagePanel(props) {
    const { t, view } = props;
    if (view.status === 'idle' || view.status === 'loading' || view.usageLoading) {
        return _jsx("p", { className: css.status, children: t('usageLoading') });
    }
    if (view.status === 'unavailable') {
        return _jsx("p", { className: `${css.notice} ${css.error}`, role: "alert", children: view.error ?? t('modelAccountUnavailable') });
    }
    return (_jsxs("div", { className: css.panel, role: "tabpanel", children: [_jsxs("div", { className: css.panelHeader, children: [_jsx("p", { className: css.description, children: view.account?.account.billing_mode === 'development_bypass' ? t('usageDescriptionBypass') : t('usageDescription') }), _jsx(Button, { type: "button", variant: "outline", disabled: view.usageLoading, onClick: () => { void props.models.loadUsage(); }, children: t('reloadUsage') })] }), view.usage.length === 0 ? _jsx("p", { className: css.notice, children: t('usageEmpty') }) : (_jsx("div", { className: css.usageList, children: view.usage.map(item => _jsx(UsageRow, { item: item, t: t }, item.id)) })), view.error !== null && _jsx("p", { className: `${css.status} ${css.error}`, role: "alert", children: view.error })] }));
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
function formatCents(value) {
    return `${(value / 100).toFixed(2)} CNY`;
}
function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(date);
}
function displayError(error, fallback) {
    return error instanceof Error && error.message !== '' ? error.message : fallback;
}
export { hasDomainOverride, openPaymentUrl, parseAmountCents };
//# sourceMappingURL=AwikiSettingsSection.js.map