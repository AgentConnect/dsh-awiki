import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/** One settings surface; tenant compatibility and Desktop release discovery retain separate owners. */
import { useState } from 'react';
import { Button, writeClipboard } from '@deepseek-ai/dsh-client-ui-primitives';
import { DSH_AWIKI_PACKAGE_VERSION } from "../package-version.generated.js";
import { compareVersions } from "../version.js";
import css from './AwikiSettingsSection.module.css';
export function AwikiUpdates(props) {
    const { snapshot, t } = props;
    const desktop = snapshot.desktop;
    const busy = snapshot.updateStatus === 'loading' || snapshot.desktopStatus === 'loading';
    return _jsxs("div", { className: css.panel, children: [_jsx("div", { className: css.actions, children: _jsx(Button, { type: "button", variant: "outline", disabled: busy || snapshot.value.switching, onClick: () => { void props.refreshUpdatePolicy(); }, children: busy ? t('updateLoading') : t('updateCheck') }) }), desktop !== undefined && _jsxs("section", { className: css.card, "aria-label": t('desktopUpdateTitle'), children: [_jsx("h3", { className: css.cardTitle, children: t('desktopUpdateTitle') }), _jsx("p", { className: css.description, children: t('updateCurrent', { version: desktop.currentVersion }) }), _jsx("p", { className: css.description, role: "status", children: t(snapshot.desktopStatus === 'unavailable' || desktop.state === 'failed' ? 'updateFailed'
                            : desktop.state === 'checking' || snapshot.desktopStatus === 'loading' ? 'updateLoading'
                                : desktop.state === 'unchecked' ? 'updateUnchecked' : desktop.noRelease ? 'desktopNoRelease'
                                    : desktop.updateAvailable ? 'updateAvailable' : 'updateLatest', { version: desktop.latestVersion }) }), desktop.latestVersion !== undefined && !desktop.noRelease && _jsx("p", { className: css.description, children: t('updateRecommended', { version: desktop.latestVersion }) }), desktop.usedCache && _jsx("p", { className: css.description, children: t('updateCached') }), _jsx("p", { className: css.description, children: t('desktopInstallHelp') }), _jsx("a", { href: desktop.downloadPageUrl, target: "_blank", rel: "noopener noreferrer", children: t('desktopDownloadPage') }), _jsx("code", { className: css.updateCommand, children: desktop.downloadPageUrl })] }), _jsx(PluginUpdate, { ...props }, `${snapshot.value.activeTenantId}:${snapshot.value.generation}:${snapshot.update?.upgradeCommand ?? ''}:${desktop?.distributionId ?? ''}`)] });
}
function PluginUpdate({ snapshot, t }) {
    const [copyState, setCopyState] = useState('idle');
    const tenant = snapshot.value.tenants.find(value => value.tenantId === snapshot.value.activeTenantId);
    const update = snapshot.update?.tenantId === snapshot.value.activeTenantId ? snapshot.update : undefined;
    const desktop = snapshot.desktop;
    // The ordinary DSH CLI requires an explicit profile; only Desktop's terminal shim supplies it.
    const command = desktop === undefined
        ? update?.upgradeCommand?.replace(/^dsh plugin add /u, 'dsh plugin --profile YOUR_PROFILE add ')
        : update?.upgradeCommand;
    const switching = snapshot.value.switching;
    const state = update?.checkState ?? (update === undefined ? 'unchecked' : update.offline ? 'failed' : update.policyUnavailable ? 'unavailable' : 'ready');
    let desktopResolves = false;
    try {
        const bundled = desktop?.bundledVersions;
        desktopResolves = desktop?.updateAvailable === true && bundled !== undefined
            && update?.recommendedPluginVersion !== undefined
            && compareVersions(bundled.plugin, update.recommendedPluginVersion) >= 0
            && (update.currentModelProxyVersion === undefined || (update.recommendedModelProxyVersion !== undefined
                && bundled.modelProxy !== undefined && compareVersions(bundled.modelProxy, update.recommendedModelProxyVersion) >= 0));
    }
    catch { /* Incomplete release metadata cannot promise a compatible upgrade. */ }
    const copy = async () => {
        if (command === undefined || switching)
            return;
        try {
            setCopyState(await writeClipboard(command) ? 'copied' : 'failed');
        }
        catch {
            setCopyState('failed');
        }
    };
    return _jsxs("section", { className: css.card, "aria-label": t('updateTitle'), children: [_jsx("h3", { className: css.cardTitle, children: t('updateTitle') }), _jsx("p", { className: css.description, children: t('updateTenant', { tenant: tenant?.displayName ?? '' }) }), _jsx("p", { className: css.description, children: t('updateCurrent', { version: update?.currentPluginVersion ?? DSH_AWIKI_PACKAGE_VERSION }) }), update !== undefined && _jsx(_Fragment, { children: update.currentModelProxyVersion !== undefined && _jsx("p", { className: css.description, children: t('updateModelCurrent', { version: update.currentModelProxyVersion }) }) }), _jsx("p", { className: css.description, role: "status", children: t(switching ? 'tenantSwitching'
                    : snapshot.updateStatus === 'loading' ? 'updateLoading'
                        : snapshot.updateStatus === 'unavailable' || state === 'failed' ? 'updateFailed'
                            : state === 'unchecked' ? 'updateUnchecked' : state === 'unavailable' ? 'updateNoPolicy'
                                : update?.restricted || update?.modelProxyRestricted ? 'updateRequired'
                                    : update?.updateAvailable ? 'updateAvailable' : 'updateLatest', { version: update?.recommendedPluginVersion }) }), update?.recommendedPluginVersion !== undefined && _jsx("p", { className: css.description, children: t('updateRecommended', { version: update.recommendedPluginVersion }) }), update?.currentModelProxyVersion !== undefined && update.recommendedModelProxyVersion !== undefined && _jsx("p", { className: css.description, children: t('updateModelRecommended', { version: update.recommendedModelProxyVersion }) }), update?.restricted && _jsx("p", { className: `${css.description} ${css.error}`, role: "alert", children: t('updateRestricted', {
                    current: update.currentPluginVersion, minimum: update.minimumPluginVersion, tenant: tenant?.displayName,
                }) }), update?.modelProxyRestricted && _jsx("p", { className: `${css.description} ${css.error}`, role: "alert", children: t('updateModelRestricted', { minimum: update.minimumModelProxyVersion }) }), update?.usedCache && _jsx("p", { className: css.description, children: t('updateCached') }), desktop !== undefined && _jsx("p", { className: css.description, children: t(desktopResolves ? 'desktopResolvesPlugin' : 'desktopPluginHelp') }), state === 'ready' && update?.updateAvailable && command === undefined && _jsx("p", { className: css.description, children: t('updateNoCommand') }), command !== undefined && !switching && _jsxs(_Fragment, { children: [_jsx("code", { className: css.updateCommand, tabIndex: 0, children: command }), _jsx("p", { className: css.description, children: t(desktop === undefined ? 'pluginInstallHelp' : 'desktopPluginCommandHelp') }), _jsx("div", { className: css.actions, children: _jsx(Button, { type: "button", variant: "outline", onClick: () => { void copy(); }, children: t('updateCopy') }) }), _jsx("p", { className: css.description, role: "status", children: copyState === 'idle' ? '' : t(copyState === 'copied' ? 'updateCopied' : 'updateCopyFailed') })] }), _jsx("a", { href: update?.releaseNotesUrl || 'https://github.com/AgentConnect/dsh-awiki#install', target: "_blank", rel: "noopener noreferrer", children: t('updateGuide') })] });
}
//# sourceMappingURL=AwikiUpdates.js.map