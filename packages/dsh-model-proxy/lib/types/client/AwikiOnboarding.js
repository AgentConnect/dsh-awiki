import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/** Model Proxy opt-in step shown before the official API-key step. */
import { useEffect, useState } from 'react';
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives';
import { RechargeComingSoonDialog } from "./RechargeComingSoonDialog.js";
import css from './AwikiOnboarding.module.css';
export function AwikiOnboarding(props) {
    const { t } = props;
    const dismiss = props.dismiss ?? props.complete;
    const IdentityAccess = props.IdentityAccess;
    const identity = props.useAwikiOnboarding((value) => value);
    const availability = props.useAwikiModelAvailability((value) => value);
    const models = props.useAwikiModelProxy((value) => value);
    const [rechargeComingSoonOpen, setRechargeComingSoonOpen] = useState(false);
    const shouldOffer = models.capability === 'available'
        && availability.status === 'ready'
        && !availability.usable;
    const openAccountSettings = () => {
        dismiss();
        props.openSection('awiki-model-proxy');
    };
    const requestRecharge = () => {
        if (!props.rechargeEnabled) {
            setRechargeComingSoonOpen(true);
            return;
        }
        openAccountSettings();
    };
    const enableModels = () => {
        void props.models.setEnabled(true).catch(() => undefined);
    };
    const identityAccess = (sessionStatus) => (_jsx(IdentityAccess, { sessionStatus: sessionStatus, identity: identity.identity, recoveryOperationId: identity.recoveryOperationId ?? null, recoveryProgress: identity.recoveryProgress ?? null, pending: identity.pending !== null, autoFocusHandle: sessionStatus === 'unregistered', inspectIdentityAccess: request => props.identity.inspectIdentityAccess(request), sendRegistrationOtp: request => props.identity.sendRegistrationOtp(request), registerIdentity: request => props.identity.registerIdentity(request), login: () => props.identity.login(), clearLocalIdentity: props.clearLocalIdentity, sendRecoveryOtp: request => props.identity.sendRecoveryOtp(request), prepareRecovery: request => props.identity.prepareRecovery(request), activateRecovery: () => props.identity.activateRecovery(), refreshRecoveryStatus: () => props.identity.refreshRecoveryStatus(), resumeRecovery: () => props.identity.resumeRecovery(), discardRecovery: () => props.identity.discardRecovery() }));
    useEffect(() => {
        if (availability.status === 'idle')
            void props.availability.load();
    }, [availability.status, props.availability]);
    useEffect(() => {
        if (models.capability === 'unavailable'
            || models.status === 'unavailable'
            || availability.status === 'unavailable'
            || (availability.status === 'ready' && availability.usable))
            props.complete();
    }, [availability.status, availability.usable, models.capability, models.status, props.complete]);
    useEffect(() => {
        if (shouldOffer && identity.status === 'cold')
            void props.identity.loadSession();
    }, [identity.status, props.identity, shouldOffer]);
    useEffect(() => {
        if (shouldOffer && identity.status === 'ready' && identity.sessionStatus === 'active') {
            void props.models.load();
        }
    }, [identity.sessionStatus, identity.status, props.models, shouldOffer]);
    useEffect(() => {
        if (shouldOffer && models.account?.enabled === true)
            props.complete();
    }, [models.account?.enabled, props.complete, shouldOffer]);
    if (rechargeComingSoonOpen) {
        return (_jsx(RechargeComingSoonDialog, { open: true, onClose: () => { setRechargeComingSoonOpen(false); }, t: t }));
    }
    if (!shouldOffer
        || models.status === 'unavailable'
        || identity.status === 'cold'
        || identity.status === 'loading'
        || models.account?.enabled === true)
        return null;
    const alternatives = _jsxs(_Fragment, { children: [_jsx(Button, { type: "button", variant: "outline", onClick: props.complete, children: t('onboardingUseApiKey') }), _jsx(Button, { type: "button", variant: "outline", onClick: dismiss, children: t('onboardingLater') })] });
    if (identity.status === 'error') {
        return (_jsxs(OnboardingModal, { title: t('onboardingConnectTitle'), closeLabel: t('onboardingClose'), onClose: dismiss, children: [_jsx("p", { className: css.description, children: identity.error ?? t('onboardingIdentityUnavailable') }), _jsx("div", { className: css.actions, children: alternatives })] }));
    }
    if (identity.sessionStatus === 'unregistered') {
        return (_jsxs(OnboardingModal, { title: t('onboardingModelTitle'), closeLabel: t('onboardingClose'), onClose: dismiss, children: [_jsx("p", { className: css.description, children: t('onboardingRegistrationDescription') }), identityAccess('unregistered'), _jsx("div", { className: css.actions, children: alternatives })] }));
    }
    if (identity.sessionStatus === 'signed-out') {
        return (_jsxs(OnboardingModal, { title: t('onboardingRestoreTitle'), closeLabel: t('onboardingClose'), onClose: dismiss, children: [_jsx("p", { className: css.description, children: t('onboardingRestoreDescription') }), identityAccess('signed-out'), _jsx("div", { className: css.actions, children: alternatives })] }));
    }
    if (identity.sessionStatus === 'recovery-required') {
        return (_jsxs(OnboardingModal, { title: t('onboardingRecoveryRequiredTitle'), closeLabel: t('onboardingClose'), onClose: dismiss, children: [_jsx("p", { className: css.description, children: t('onboardingRecoveryRequiredDescription') }), identityAccess('recovery-required'), _jsx("div", { className: css.actions, children: alternatives })] }));
    }
    if ((models.status === 'idle' || models.status === 'loading') && models.account === null)
        return null;
    const account = models.account?.account;
    const pendingOrder = props.rechargeEnabled ? models.account?.pending_recharge_order ?? null : null;
    const accessUnavailable = account?.model_access_available === false;
    return (_jsxs(OnboardingModal, { title: t('onboardingEnableTitle'), closeLabel: t('onboardingClose'), onClose: dismiss, children: [account === undefined ? (_jsx("p", { className: css.error, role: "alert", children: models.error ?? t('modelAccountUnavailable') })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: css.accountRow, children: [_jsx("span", { children: t('accountBalance') }), _jsxs("strong", { children: [account.balance, " ", account.currency] })] }), _jsx("p", { className: css.description, children: account.billing_mode === 'development_bypass'
                            ? t('onboardingBypassDescription')
                            : pendingOrder !== null
                                ? t('onboardingPendingRechargeDescription')
                                : account.model_access_reason === 'insufficient_balance'
                                    ? t('onboardingInsufficientBalanceDescription')
                                    : t('onboardingStrictDescription') }), props.rechargeEnabled && !account.payments_available && _jsx("p", { className: css.notice, children: t('paymentsUnavailable') }), models.error !== null && _jsx("p", { className: css.error, role: "alert", children: models.error })] })), _jsxs("div", { className: css.actions, children: [pendingOrder !== null ? (_jsx(Button, { type: "button", onClick: requestRecharge, children: t('continuePayment') })) : accessUnavailable ? (_jsx(Button, { type: "button", disabled: props.rechargeEnabled && account?.payments_available !== true, onClick: requestRecharge, children: t('goToRecharge') })) : account !== undefined ? (_jsx(Button, { type: "button", disabled: models.pending !== null || models.status === 'loading', onClick: enableModels, children: models.pending === 'enable' ? t('enablingModels') : t('enableModels') })) : null, alternatives] })] }));
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