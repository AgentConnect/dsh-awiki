import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/** AWiki identity and installation settings contributed to DSH settings. */
import { useEffect, useId, useState } from 'react';
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives';
import { AWIKI_DOMAIN_FIELD, DEFAULT_AWIKI_DOMAIN, normalizeAwikiDomain, } from "../domain.js";
import { AwikiDevices } from "./AwikiDevices.js";
import { AwikiIntegrationSettings } from "./AwikiIntegrationSettings.js";
import css from './AwikiSettingsSection.module.css';
function hasDomainOverride(snapshot) {
    return typeof snapshot.user === 'object'
        && snapshot.user !== null
        && !Array.isArray(snapshot.user)
        && Object.hasOwn(snapshot.user, AWIKI_DOMAIN_FIELD);
}
/** Render only the settings owned by the main AWiki identity and messaging plugin. */
export function AwikiSettingsSection(props) {
    const settings = props.useAwikiSettings(value => value);
    const awiki = props.useAwiki(value => value);
    const [tab, setTab] = useState('basic');
    const tabsId = useId();
    useEffect(() => {
        if (tab === 'devices' && awiki.status === 'cold')
            void props.loadAwiki();
    }, [awiki.status, props.loadAwiki, tab]);
    return (_jsxs("section", { className: css.section, children: [_jsxs("div", { className: css.heading, children: [_jsx("h2", { className: css.title, children: props.t('nav') }), _jsx("p", { className: css.intro, children: props.t('intro') })] }), _jsxs("div", { className: css.tabs, role: "tablist", "aria-label": props.t('tabsLabel'), children: [_jsx("button", { id: `${tabsId}-basic-tab`, type: "button", role: "tab", "aria-selected": tab === 'basic', "aria-controls": `${tabsId}-basic-panel`, onClick: () => { setTab('basic'); }, children: props.t('basicTab') }), _jsx("button", { id: `${tabsId}-devices-tab`, type: "button", role: "tab", "aria-selected": tab === 'devices', "aria-controls": `${tabsId}-devices-panel`, onClick: () => { setTab('devices'); }, children: props.t('devicesTab') }), _jsx("button", { id: `${tabsId}-integration-tab`, type: "button", role: "tab", "aria-selected": tab === 'integration', "aria-controls": `${tabsId}-integration-panel`, onClick: () => { setTab('integration'); }, children: props.t('integrationTab') })] }), tab === 'basic' && _jsx("div", { id: `${tabsId}-basic-panel`, role: "tabpanel", "aria-labelledby": `${tabsId}-basic-tab`, children: _jsx(AdvancedPanel, { ...props, settings: settings }) }), tab === 'devices' && _jsx("div", { id: `${tabsId}-devices-panel`, role: "tabpanel", "aria-labelledby": `${tabsId}-devices-tab`, children: awiki.status === 'cold' || awiki.status === 'loading'
                    ? _jsx("p", { className: css.status, role: "status", children: props.t('devicesLoading') })
                    : awiki.status === 'error'
                        ? _jsx("p", { className: `${css.status} ${css.error}`, role: "alert", children: awiki.error })
                        : awiki.sessionStatus === 'active'
                            ? _jsx(AwikiDevices, { active: true, pending: awiki.pending !== null, refreshDeviceManagement: props.refreshDeviceManagement, startDeviceJoinVerification: props.startDeviceJoinVerification, approveDeviceJoin: props.approveDeviceJoin, rejectDeviceJoin: props.rejectDeviceJoin, revokeDevice: props.revokeDevice, prepareRootTransfer: props.prepareRootTransfer, confirmRootTransfer: props.confirmRootTransfer })
                            : _jsx("p", { className: css.notice, children: props.t('devicesUnavailable') }) }), tab === 'integration' && _jsx("div", { id: `${tabsId}-integration-panel`, role: "tabpanel", "aria-labelledby": `${tabsId}-integration-tab`, children: _jsx(AwikiIntegrationSettings, { ...props }) })] }));
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
    return (_jsxs("div", { className: css.panel, children: [_jsxs("form", { className: css.card, onSubmit: (event) => { void save(event); }, children: [_jsx("label", { className: css.label, htmlFor: "awiki-default-domain", children: t('domainLabel') }), _jsx("p", { className: css.description, children: t('domainDescription') }), _jsx("input", { id: "awiki-default-domain", className: css.input, value: draft, disabled: disabled, spellCheck: false, autoCapitalize: "none", autoCorrect: "off", inputMode: "url", placeholder: DEFAULT_AWIKI_DOMAIN, onChange: (event) => { setDraft(event.target.value); setEdited(true); setStatus(null); } }), _jsx("p", { className: css.defaultValue, children: t('defaultValue', { domain: DEFAULT_AWIKI_DOMAIN }) }), _jsxs("div", { className: css.actions, children: [_jsx(Button, { type: "submit", disabled: disabled || !edited || draft.trim() === '', children: pending ? t('saving') : t('save') }), _jsx(Button, { type: "button", variant: "outline", disabled: disabled || !overridden, onClick: () => { void reset(); }, children: t('reset') })] }), unavailable
                        ? _jsx("p", { className: `${css.status} ${css.error}`, role: "alert", children: t('unavailable') })
                        : !settings.writable
                            ? _jsx("p", { className: `${css.status} ${css.error}`, role: "alert", children: t('readOnly') })
                            : _jsx("p", { className: `${css.status} ${status?.kind === 'error' ? css.error : ''}`, role: "status", children: status?.text ?? '' })] }), _jsx("p", { className: css.notice, children: t('identityNotice') }), _jsxs("section", { className: css.dangerZone, "aria-labelledby": "awiki-danger-zone-title", children: [_jsxs("div", { className: css.dangerCopy, children: [_jsx("h3", { id: "awiki-danger-zone-title", className: css.dangerTitle, children: t('dangerTitle') }), _jsx("p", { className: css.dangerDescription, children: t('dangerDescription') })] }), _jsx(Button, { type: "button", variant: "outline", className: css.dangerButton, disabled: unavailable || clearing, onClick: () => { setClearStatus(null); setClearOpen(true); }, children: t('clearLocalData') }), clearStatus?.kind === 'saved' && _jsx("p", { className: css.status, role: "status", children: clearStatus.text })] }), _jsxs(Modal, { open: clearOpen, onClose: closeClear, title: t('clearDialogTitle'), closeLabel: t('cancel'), description: t('clearDialogDescription'), className: css.clearDialog ?? '', footer: _jsxs(_Fragment, { children: [_jsx(Button, { type: "button", variant: "outline", disabled: clearing, onClick: closeClear, children: t('cancel') }), _jsx(Button, { type: "button", variant: "outline", className: css.clearConfirmButton, disabled: clearing || clearDraft !== t('clearConfirmationPhrase'), onClick: () => { void clearLocalData(); }, children: clearing ? t('clearing') : t('clearConfirm') })] }), children: [_jsxs("div", { className: css.clearWarning, children: [_jsx("p", { children: t('clearScope') }), _jsx("p", { children: t('clearRemoteNotice') })] }), _jsx("label", { className: css.confirmLabel, htmlFor: "awiki-clear-confirmation", children: t('clearConfirmationLabel', { phrase: t('clearConfirmationPhrase') }) }), _jsx("input", { id: "awiki-clear-confirmation", className: css.input, value: clearDraft, disabled: clearing, autoComplete: "off", spellCheck: false, autoFocus: true, onChange: (event) => { setClearDraft(event.target.value); } }), clearStatus?.kind === 'error' && _jsx("p", { className: `${css.status} ${css.error}`, role: "alert", children: clearStatus.text })] })] }));
}
export { hasDomainOverride };
//# sourceMappingURL=AwikiSettingsSection.js.map