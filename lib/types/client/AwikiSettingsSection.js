import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/** AWiki tenant, local-data, and optional-integration settings. */
import { useEffect, useState } from 'react';
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives';
import { normalizeAwikiDomain } from "../domain.js";
import { AwikiDevices } from "./AwikiDevices.js";
import { AwikiIntegrationSettings } from "./AwikiIntegrationSettings.js";
import css from './AwikiSettingsSection.module.css';
export function AwikiSettingsSection(props) {
    const [tab, setTab] = useState('tenants');
    const tenantSnapshot = props.useAwikiTenants(value => value);
    const awiki = props.useAwiki(value => value);
    const restricted = tenantSnapshot.status === 'ready' && tenantSnapshot.update?.restricted === true;
    const tabs = restricted ? [
        { id: 'tenants', label: props.t('tenantTab') },
    ] : [
        { id: 'tenants', label: props.t('tenantTab') },
        { id: 'devices', label: props.t('devicesTab') },
        { id: 'local', label: props.t('localDataTab') },
        { id: 'integration', label: props.t('integrationTab') },
    ];
    useEffect(() => {
        if (restricted && tab !== 'tenants')
            setTab('tenants');
    }, [restricted, tab]);
    useEffect(() => {
        if (!restricted && tab === 'devices' && awiki.status === 'cold')
            void props.loadAwiki();
    }, [awiki.status, props.loadAwiki, restricted, tab]);
    return (_jsxs("section", { className: css.section, children: [_jsxs("div", { className: css.heading, children: [_jsx("h2", { className: css.title, children: props.t('nav') }), _jsx("p", { className: css.intro, children: props.t('intro') })] }), _jsx("div", { className: css.tabs, role: "tablist", "aria-label": props.t('tabsLabel'), children: tabs.map(item => _jsx("button", { type: "button", role: "tab", "aria-selected": tab === item.id, className: `${css.tab} ${tab === item.id ? css.tabActive : ''}`, onClick: () => { setTab(item.id); }, children: item.label }, item.id)) }), _jsxs("div", { role: "tabpanel", children: [(restricted || tab === 'tenants') && _jsx(TenantPanel, { ...props }), !restricted && tab === 'devices' && (awiki.status === 'cold' || awiki.status === 'loading'
                        ? _jsx("p", { className: css.status, role: "status", children: props.t('devicesLoading') })
                        : awiki.status === 'error'
                            ? _jsx("p", { className: `${css.status} ${css.error}`, role: "alert", children: awiki.error })
                            : awiki.sessionStatus === 'active'
                                ? _jsx(AwikiDevices, { active: true, pending: awiki.pending !== null, refreshDeviceManagement: props.refreshDeviceManagement, startDeviceJoinVerification: props.startDeviceJoinVerification, approveDeviceJoin: props.approveDeviceJoin, rejectDeviceJoin: props.rejectDeviceJoin, revokeDevice: props.revokeDevice, prepareRootTransfer: props.prepareRootTransfer, confirmRootTransfer: props.confirmRootTransfer })
                                : _jsx("p", { className: css.notice, children: props.t('devicesUnavailable') })), !restricted && tab === 'local' && _jsx(LocalDataPanel, { ...props }), !restricted && tab === 'integration' && _jsx(AwikiIntegrationSettings, { ...props })] })] }));
}
function TenantPanel(props) {
    const snapshot = props.useAwikiTenants(value => value);
    const [name, setName] = useState('');
    const [domain, setDomain] = useState('');
    const [pending, setPending] = useState(false);
    const [status, setStatus] = useState(null);
    if (snapshot.status === 'loading')
        return _jsx("p", { className: css.status, children: props.t('tenantLoading') });
    if (snapshot.status !== 'ready')
        return _jsx("p", { className: `${css.status} ${css.error}`, role: "alert", children: props.t('tenantUnavailable') });
    const disabled = pending || snapshot.value.switching;
    const restricted = snapshot.update?.restricted === true;
    const create = async (event) => {
        event.preventDefault();
        let normalized;
        try {
            normalized = normalizeAwikiDomain(domain);
        }
        catch {
            setStatus({ kind: 'error', text: props.t('invalidDomain') });
            return;
        }
        setPending(true);
        setStatus(null);
        try {
            await props.createTenant(name.trim(), normalized);
            setName('');
            setDomain('');
            setStatus({ kind: 'saved', text: props.t('tenantCreated') });
        }
        catch (error) {
            setStatus({ kind: 'error', text: error instanceof Error ? error.message : props.t('tenantChangeFailed') });
        }
        finally {
            setPending(false);
        }
    };
    return (_jsxs("div", { className: css.panel, children: [snapshot.value.diagnostic !== undefined && _jsx("p", { className: `${css.notice} ${css.error}`, role: "alert", children: props.t('tenantDiagnostic') }), _jsx("div", { className: css.tenantList, children: snapshot.value.tenants.filter(tenant => tenant.lifecycle !== 'archived').map(tenant => _jsx(TenantRow, { ...props, tenant: tenant, disabled: disabled, managementDisabled: restricted, setPending: setPending, setStatus: setStatus }, tenant.tenantId)) }), _jsx(UpdatePolicyCard, { ...props, snapshot: snapshot, disabled: disabled }), !restricted && _jsxs("form", { className: css.card, onSubmit: (event) => { void create(event); }, children: [_jsx("h3", { className: css.cardTitle, children: props.t('tenantAdd') }), _jsx("label", { className: css.label, htmlFor: "awiki-tenant-name", children: props.t('tenantName') }), _jsx("input", { id: "awiki-tenant-name", className: css.input, value: name, disabled: disabled, maxLength: 80, onChange: event => { setName(event.target.value); } }), _jsx("label", { className: css.label, htmlFor: "awiki-tenant-domain", children: props.t('tenantDomain') }), _jsx("input", { id: "awiki-tenant-domain", className: css.input, value: domain, disabled: disabled, spellCheck: false, autoCapitalize: "none", autoCorrect: "off", inputMode: "url", placeholder: "tenant.example", onChange: event => { setDomain(event.target.value); } }), _jsx("p", { className: css.description, children: props.t('tenantDomainHelp') }), _jsx("div", { className: css.actions, children: _jsx(Button, { type: "submit", disabled: disabled || name.trim() === '' || domain.trim() === '', children: props.t('tenantCreate') }) })] }), _jsx("p", { className: `${css.status} ${status?.kind === 'error' ? css.error : ''}`, role: "status", children: status?.text ?? (snapshot.value.switching ? props.t('tenantSwitching') : '') })] }));
}
function UpdatePolicyCard(props) {
    const update = props.snapshot.update;
    const command = update === undefined
        ? ''
        : `dsh plugin --profile web add @awiki/dsh-plugin@${update.recommendedPluginVersion ?? update.currentPluginVersion}${update.currentModelProxyVersion === undefined ? '' : ` @awiki/dsh-model-proxy@${update.recommendedModelProxyVersion ?? update.currentModelProxyVersion}`}`;
    const copy = async () => {
        if (command !== '')
            await navigator.clipboard.writeText(command);
    };
    return _jsxs("section", { className: css.card, "aria-labelledby": "awiki-update-title", children: [_jsx("h3", { id: "awiki-update-title", className: css.cardTitle, children: props.t('updateTitle') }), props.snapshot.updateStatus === 'loading' && _jsx("p", { className: css.description, children: props.t('updateLoading') }), props.snapshot.updateStatus === 'unavailable' && _jsx("p", { className: css.description, children: props.t('updateUnavailable') }), update?.policyUnavailable === true && _jsx("p", { className: css.description, children: props.t('updateNoPolicy') }), update !== undefined && !update.policyUnavailable && _jsxs(_Fragment, { children: [_jsx("p", { className: css.description, children: props.t(update.restricted ? 'updateRestricted' : 'updateVersions', {
                            current: update.currentPluginVersion,
                            recommended: update.recommendedPluginVersion ?? update.currentPluginVersion,
                            minimum: update.minimumPluginVersion ?? update.currentPluginVersion,
                        }) }), command !== '' && _jsx("code", { className: css.updateCommand, children: command }), _jsx("p", { className: css.description, children: props.t('updateRestart') })] }), _jsxs("div", { className: css.actions, children: [_jsx(Button, { type: "button", variant: "outline", disabled: props.disabled || props.snapshot.updateStatus === 'loading', onClick: () => { void props.refreshUpdatePolicy(); }, children: props.t('updateCheck') }), command !== '' && _jsx(Button, { type: "button", variant: "outline", disabled: props.disabled, onClick: () => { void copy(); }, children: props.t('updateCopy') })] })] });
}
function TenantRow(props) {
    const [draftName, setDraftName] = useState(props.tenant.displayName);
    const run = async (operation, success) => {
        props.setPending(true);
        props.setStatus(null);
        try {
            await operation();
            props.setStatus({ kind: 'saved', text: success });
        }
        catch (error) {
            props.setStatus({ kind: 'error', text: error instanceof Error ? error.message : props.t('tenantChangeFailed') });
        }
        finally {
            props.setPending(false);
        }
    };
    const current = props.tenant.lifecycle === 'active';
    const localizedDisplayName = props.tenant.displayNames === undefined
        ? props.tenant.displayName
        : (typeof document !== 'undefined' && document.documentElement.lang.toLowerCase().startsWith('zh')
            ? props.tenant.displayNames['zh-CN']
            : props.tenant.displayNames.en);
    return (_jsxs("article", { className: `${css.tenantRow} ${current ? css.tenantCurrent : ''}`, children: [_jsxs("div", { className: css.tenantCopy, children: [props.tenant.kind === 'custom' && !props.managementDisabled ? _jsx("input", { "aria-label": props.t('tenantName'), className: css.inlineInput, value: draftName, disabled: props.disabled, maxLength: 80, onChange: event => { setDraftName(event.target.value); } }) : _jsx("strong", { children: localizedDisplayName }), _jsx("span", { className: css.tenantMeta, children: props.tenant.didHost }), _jsxs("span", { className: css.tenantBadges, children: [_jsx("span", { children: props.tenant.kind === 'built_in' ? props.t('tenantOfficial') : props.t('tenantCustom') }), current && _jsx("span", { children: props.t('tenantCurrent') })] })] }), _jsxs("div", { className: css.actions, children: [!current && _jsx(Button, { type: "button", disabled: props.disabled, onClick: () => { void run(() => props.switchTenant(props.tenant.tenantId), props.t('tenantSwitched')); }, children: props.t('tenantSwitch') }), props.tenant.kind === 'custom' && !props.managementDisabled && _jsxs(_Fragment, { children: [_jsx(Button, { type: "button", variant: "outline", disabled: props.disabled || draftName.trim() === '' || draftName === props.tenant.displayName, onClick: () => { void run(() => props.renameTenant(props.tenant.tenantId, draftName.trim()), props.t('tenantRenamed')); }, children: props.t('save') }), !current && _jsx(Button, { type: "button", variant: "outline", disabled: props.disabled, onClick: () => { void run(() => props.archiveTenant(props.tenant.tenantId), props.t('tenantArchived')); }, children: props.t('tenantArchive') })] })] })] }));
}
function LocalDataPanel(props) {
    const [clearOpen, setClearOpen] = useState(false);
    const [clearDraft, setClearDraft] = useState('');
    const [clearing, setClearing] = useState(false);
    const [status, setStatus] = useState(null);
    const close = () => {
        if (clearing)
            return;
        setClearOpen(false);
        setClearDraft('');
    };
    const clear = async () => {
        if (clearDraft !== props.t('clearConfirmationPhrase'))
            return;
        setClearing(true);
        setStatus(null);
        try {
            await props.clearLocalData();
            setClearOpen(false);
            setClearDraft('');
            setStatus({ kind: 'saved', text: props.t('clearSucceeded') });
        }
        catch {
            setStatus({ kind: 'error', text: props.t('clearFailed') });
        }
        finally {
            setClearing(false);
        }
    };
    return _jsxs("div", { className: css.panel, children: [_jsx("p", { className: css.notice, children: props.t('localDataNotice') }), _jsxs("section", { className: css.dangerZone, "aria-labelledby": "awiki-danger-zone-title", children: [_jsxs("div", { className: css.dangerCopy, children: [_jsx("h3", { id: "awiki-danger-zone-title", className: css.dangerTitle, children: props.t('dangerTitle') }), _jsx("p", { className: css.dangerDescription, children: props.t('dangerDescription') })] }), _jsx(Button, { type: "button", variant: "outline", className: css.dangerButton, disabled: clearing, onClick: () => { setStatus(null); setClearOpen(true); }, children: props.t('clearLocalData') }), _jsx("p", { className: `${css.status} ${status?.kind === 'error' ? css.error : ''}`, role: "status", children: status?.text ?? '' })] }), _jsxs(Modal, { open: clearOpen, onClose: close, title: props.t('clearDialogTitle'), closeLabel: props.t('cancel'), description: props.t('clearDialogDescription'), className: css.clearDialog ?? '', footer: _jsxs(_Fragment, { children: [_jsx(Button, { type: "button", variant: "outline", disabled: clearing, onClick: close, children: props.t('cancel') }), _jsx(Button, { type: "button", variant: "outline", className: css.clearConfirmButton, disabled: clearing || clearDraft !== props.t('clearConfirmationPhrase'), onClick: () => { void clear(); }, children: clearing ? props.t('clearing') : props.t('clearConfirm') })] }), children: [_jsxs("div", { className: css.clearWarning, children: [_jsx("p", { children: props.t('clearScope') }), _jsx("p", { children: props.t('clearRemoteNotice') })] }), _jsx("label", { className: css.confirmLabel, htmlFor: "awiki-clear-confirmation", children: props.t('clearConfirmationLabel', { phrase: props.t('clearConfirmationPhrase') }) }), _jsx("input", { id: "awiki-clear-confirmation", className: css.input, value: clearDraft, disabled: clearing, autoComplete: "off", spellCheck: false, autoFocus: true, onChange: event => { setClearDraft(event.target.value); } })] })] });
}
//# sourceMappingURL=AwikiSettingsSection.js.map