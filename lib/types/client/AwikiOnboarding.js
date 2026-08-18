import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/** AWiki identity and model opt-in step shown before the official API-key step. */
import { useEffect } from 'react';
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives';
import { AwikiRegistrationForm } from "./AwikiOverlay.js";
import css from './AwikiOnboarding.module.css';
export function AwikiOnboarding(props) {
    const { t } = props;
    const dismiss = props.dismiss ?? props.complete;
    const identity = props.useAwikiOnboarding((value) => value);
    const models = props.useAwikiModelProxy((value) => value);
    useEffect(() => {
        if (identity.status === 'cold')
            void props.identity.loadSession();
    }, [identity.status, props.identity]);
    useEffect(() => {
        if (identity.status === 'ready' && identity.sessionStatus === 'active' && models.status === 'idle') {
            void props.models.load();
        }
    }, [identity.sessionStatus, identity.status, models.status, props.models]);
    useEffect(() => {
        if (models.account?.enabled === true)
            props.complete();
    }, [models.account?.enabled, props.complete]);
    if (identity.status === 'cold' || identity.status === 'loading' || models.account?.enabled === true)
        return null;
    const alternatives = _jsxs(_Fragment, { children: [_jsx(Button, { type: "button", variant: "outline", onClick: props.complete, children: t('onboardingUseApiKey') }), _jsx(Button, { type: "button", variant: "outline", onClick: dismiss, children: t('onboardingLater') })] });
    if (identity.status === 'error') {
        return (_jsxs(OnboardingModal, { title: t('onboardingConnectTitle'), closeLabel: t('onboardingClose'), onClose: dismiss, children: [_jsx("p", { className: css.description, children: identity.error ?? t('onboardingIdentityUnavailable') }), _jsx("div", { className: css.actions, children: alternatives })] }));
    }
    if (identity.sessionStatus === 'unregistered') {
        return (_jsxs(OnboardingModal, { title: t('onboardingModelTitle'), closeLabel: t('onboardingClose'), onClose: dismiss, children: [_jsx("p", { className: css.description, children: t('onboardingRegistrationDescription') }), _jsx(AwikiRegistrationForm, { pending: identity.pending !== null, autoFocusHandle: true, sendRegistrationOtp: request => props.identity.sendRegistrationOtp(request), registerIdentity: request => props.identity.registerIdentity(request) }), _jsx("div", { className: css.actions, children: alternatives })] }));
    }
    if (identity.sessionStatus === 'signed-out') {
        return (_jsxs(OnboardingModal, { title: t('onboardingRestoreTitle'), closeLabel: t('onboardingClose'), onClose: dismiss, children: [_jsx("p", { className: css.description, children: t('onboardingRestoreDescription') }), _jsxs("div", { className: css.actions, children: [_jsx(Button, { type: "button", disabled: identity.pending !== null, onClick: () => { void props.identity.login(); }, children: t('onboardingRestore') }), alternatives] })] }));
    }
    if (models.status === 'idle' || models.status === 'loading')
        return null;
    const account = models.account?.account;
    return (_jsxs(OnboardingModal, { title: t('onboardingEnableTitle'), closeLabel: t('onboardingClose'), onClose: dismiss, children: [models.status === 'unavailable' || account === undefined ? (_jsx("p", { className: css.error, role: "alert", children: models.error ?? t('modelAccountUnavailable') })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: css.accountRow, children: [_jsx("span", { children: t('accountBalance') }), _jsxs("strong", { children: [account.balance, " ", account.currency] })] }), _jsx("p", { className: css.description, children: account.billing_mode === 'development_bypass'
                            ? t('onboardingBypassDescription')
                            : t('onboardingStrictDescription') }), !account.payments_available && _jsx("p", { className: css.notice, children: t('paymentsUnavailable') })] })), _jsxs("div", { className: css.actions, children: [_jsx(Button, { type: "button", disabled: account?.model_access_available !== true || models.pending !== null, onClick: () => { void props.models.setEnabled(true); }, children: models.pending === 'enable' ? t('enablingModels') : t('enableModels') }), account?.model_access_available === false
                        ? _jsx(Button, { type: "button", variant: "outline", onClick: () => { props.openSection('awiki'); }, children: t('tabAccount') })
                        : alternatives] })] }));
}
function OnboardingModal({ title, closeLabel, onClose, children }) {
    useEffect(() => {
        const root = document.getElementById('root');
        if (root === null)
            return;
        const previous = root.inert;
        root.inert = true;
        return () => { root.inert = previous; };
    }, []);
    return (_jsx(Modal, { open: true, title: title, closeLabel: closeLabel, onClose: onClose, className: css.dialog ?? '', contentClassName: css.modalContent, children: _jsx("div", { className: css.content, children: children }) }));
}
//# sourceMappingURL=AwikiOnboarding.js.map