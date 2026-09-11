import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { SHORT_HANDLE_INVITE_MESSAGE } from "../registration-policy.js";
import { useRecoveryOtpCooldown } from "./otp-cooldown.js";
import { useDraftState } from "./drafts.js";
/** One explicit create, recover, resume, or replace flow for AWiki identity access. */
import { useEffect, useRef, useState } from 'react';
import { IconUserOutline16 } from '@deepseek-ai/dsh-client-ui-primitives';
import { AwikiIdentityPage } from "./AwikiIdentityPage.js";
import { AwikiRecoveryForm, } from "./AwikiRecoveryForm.js";
import css from './AwikiIdentityAccess.module.css';
function Recovery(props) {
    return (_jsx(AwikiRecoveryForm, { operationId: props.recoveryOperationId, progress: props.recoveryProgress, pending: props.pending, statusError: props.accessError ?? null, requestError: props.requestError ?? null, sendRecoveryOtp: props.sendRecoveryOtp, prepareRecovery: props.prepareRecovery, activateRecovery: props.activateRecovery, refreshRecoveryStatus: props.refreshRecoveryStatus, resumeRecovery: props.resumeRecovery, discardRecovery: props.discardRecovery, ...props.continueRecoveryForHandle === undefined ? {} : { continueRecoveryForHandle: props.continueRecoveryForHandle }, ...props.enterRecoveredSession === undefined ? {} : { enterRecoveredSession: props.enterRecoveredSession }, ...props.onExit === undefined ? {} : { onExit: props.onExit }, ...props.onExitLabel === undefined ? {} : { onExitLabel: props.onExitLabel }, ...props.initialFactorContext === undefined ? {} : { initialFactorContext: props.initialFactorContext }, ...props.fixedHandle === undefined ? {} : { fixedHandle: props.fixedHandle }, ...props.requestTitle === undefined ? {} : { requestTitle: props.requestTitle }, ...props.requestDescription === undefined ? {} : { requestDescription: props.requestDescription }, retryAt: props.recoveryOtpRetryAt }, props.recoveryOperationId ?? props.fixedHandle ?? 'new'));
}
/** Keep phone and OTP values in private browser memory for the duration of this explicit user flow. */
export function AwikiIdentityAccess(props) {
    const [shortHandleInviteNotice, setShortHandleInviteNotice] = useDraftState('identity:shortHandleInviteNotice', false, false);
    const recoveryCooldown = useRecoveryOtpCooldown();
    const [phone, setPhone] = useDraftState('identity:phone', '');
    const [handle, setHandle] = useDraftState('identity:handle', '');
    const [otp, setOtp] = useDraftState('identity:otp', '');
    const [registrationOtpSent, setRegistrationOtpSent] = useDraftState('identity:registrationOtpSent', false, false);
    const [recoveryFactorContext, setRecoveryFactorContext] = useDraftState('identity:recoveryFactorContext', null, false);
    const [notice, setNotice] = useDraftState('identity:notice', null, false);
    const [error, setError] = useDraftState('identity:error', null, false);
    const [retryDeadline, setRetryDeadline] = useDraftState('identity:retryDeadline', null, false);
    const [retrySeconds, setRetrySeconds] = useState(0);
    const [signedOutAlternative, setSignedOutAlternative] = useDraftState('identity:signedOutAlternative', 'none', false);
    const [replaceConfirmed, setReplaceConfirmed] = useState(false);
    const [loginFailed, setLoginFailed] = useDraftState('identity:loginFailed', false, false);
    const [joinContext, setJoinContext] = useDraftState('identity:joinContext', null, false);
    const [recoveryChoice, setRecoveryChoice] = useDraftState('identity:recoveryChoice', null, false);
    const [recoveryRiskConfirmed, setRecoveryRiskConfirmed] = useDraftState('identity:recoveryRiskConfirmed', false, false);
    const [recoveryEntryOpen, setRecoveryEntryOpen] = useDraftState('identity:recoveryEntryOpen', false, false);
    const validRecoveryEntryOpen = recoveryEntryOpen && props.sessionStatus === 'recovery-required';
    const recoveryConfirmationInFlight = useRef(false);
    const [recoveryConfirming, setRecoveryConfirming] = useState(false);
    const [joinCheck, setJoinCheck] = useState('loading');
    const [joinProgress, setJoinProgress] = useState(null);
    const [deviceRejoinHandle, setDeviceRejoinHandle] = useDraftState('identity:deviceRejoinHandle', null, false);
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
    useEffect(() => {
        if (recoveryEntryOpen && props.sessionStatus !== 'recovery-required')
            setRecoveryEntryOpen(false);
    }, [props.sessionStatus, recoveryEntryOpen, setRecoveryEntryOpen]);
    const resetIdentityEntry = () => {
        setShortHandleInviteNotice(false);
        setOtp('');
        setRegistrationOtpSent(false);
        setRecoveryFactorContext(null);
        setRecoveryChoice(null);
        setRecoveryRiskConfirmed(false);
        setRecoveryEntryOpen(false);
        setNotice(null);
        setError(null);
        setRetryDeadline(null);
        setRetrySeconds(0);
    };
    const returnToSignedOutHome = () => {
        resetIdentityEntry();
        setSignedOutAlternative('none');
        setReplaceConfirmed(false);
        setLoginFailed(false);
    };
    const exitRecovery = () => {
        returnToSignedOutHome();
        props.leaveRecovery?.();
    };
    const requestRegistrationOtp = async () => {
        setError(null);
        const result = await props.sendRegistrationOtp({ handle: handle.trim(), phone: phone.trim() });
        if (!result.ok) {
            if (result.failureCode === 'short-handle-invite-required') {
                setNotice(null);
                setShortHandleInviteNotice(true);
                return;
            }
            setError(result.error);
            return;
        }
        const cooldownSeconds = Math.max(0, Math.ceil(result.value.retryAfterSeconds));
        setRegistrationOtpSent(true);
        setRetryDeadline(Date.now() + cooldownSeconds * 1000);
        setRetrySeconds(cooldownSeconds);
        setNotice(`注册验证码已发送；${cooldownSeconds} 秒后可重新获取。`);
    };
    const requestIdentityOtp = async () => {
        setError(null);
        const result = await props.continueRecoveryForHandle?.(handle.trim());
        if (result !== undefined && !result.ok)
            return setError(result.error);
        if (result?.ok && result.value)
            return;
        setShortHandleInviteNotice(false);
        await requestRegistrationOtp();
    };
    const completeRegistration = async () => {
        if (!registrationOtpSent)
            return;
        setError(null);
        const result = await props.registerIdentity({
            phone: phone.trim(),
            handle: handle.trim(),
            otp: otp.trim(),
        });
        if (!result.ok) {
            if (result.failureCode === 'short-handle-invite-required') {
                resetIdentityEntry();
                setNotice(null);
                setShortHandleInviteNotice(true);
                return;
            }
            setError(result.error);
            return;
        }
        if (result.value.status === 'join-required') {
            setOtp('');
            setJoinContext({ fullHandle: result.value.fullHandle, phone: phone.trim() });
            return;
        }
        setPhone('');
        setHandle('');
        setDeviceRejoinHandle(null);
        resetIdentityEntry();
    };
    useEffect(() => {
        if (props.access === undefined || props.access === null)
            return;
        const choice = props.access.choice;
        setJoinContext(choice === null ? null : { fullHandle: choice.fullHandle, phone });
    }, [props.access]);
    const beginJoin = async () => {
        setError(null);
        const result = await props.beginDeviceJoin();
        if (!result.ok) {
            setError(result.error);
            await props.refreshIdentityAccess?.();
            return;
        }
        setJoinCheck('ready');
        setJoinProgress(result.value);
    };
    const cancelJoin = async () => {
        setError(null);
        const result = await props.cancelDeviceJoin();
        if (!result.ok)
            return setError(result.error);
        setJoinContext(null);
        setJoinProgress(null);
        resetIdentityEntry();
    };
    const chooseRecovery = () => {
        if (joinContext === null)
            return;
        setError(null);
        setRecoveryChoice(joinContext.fullHandle);
        setRecoveryFactorContext({ fullHandle: joinContext.fullHandle, phone: joinContext.phone });
        setRecoveryRiskConfirmed(false);
    };
    const cancelRecoveryChoice = () => {
        setRecoveryChoice(null);
        setRecoveryFactorContext(null);
        setRecoveryRiskConfirmed(false);
        setError(null);
    };
    const confirmRecoveryChoice = async () => {
        if (recoveryChoice === null || recoveryConfirmationInFlight.current)
            return;
        recoveryConfirmationInFlight.current = true;
        setRecoveryConfirming(true);
        setError(null);
        try {
            const factor = recoveryFactorContext ?? { fullHandle: recoveryChoice, phone: '' };
            if (joinContext !== null) {
                const continued = await props.continueRecoveryForHandle?.(factor.fullHandle);
                if (continued !== undefined && !continued.ok)
                    return setError(continued.error);
                if (continued?.ok && continued.value) {
                    setJoinContext(null);
                    setRecoveryRiskConfirmed(true);
                    return;
                }
                const recovery = await props.beginRecoveryFromDeviceJoin(factor);
                if (!recovery.ok) {
                    cancelRecoveryChoice();
                    void props.refreshIdentityAccess?.();
                    return setError(recovery.error);
                }
                setJoinContext(null);
                setRecoveryRiskConfirmed(true);
                if (recovery.value === null)
                    return;
                recoveryCooldown.start(recovery.value.retryAfterSeconds);
                setRecoveryFactorContext({ fullHandle: recovery.value.fullHandle, phone: factor.phone });
            }
            else {
                setRecoveryRiskConfirmed(true);
                if (factor.phone === '')
                    return;
                const recovery = await props.sendRecoveryOtp(factor);
                if (!recovery.ok)
                    return setError(recovery.error);
                recoveryCooldown.start(recovery.value.retryAfterSeconds);
                setRecoveryFactorContext({ fullHandle: recovery.value.fullHandle, phone: factor.phone });
            }
        }
        finally {
            recoveryConfirmationInFlight.current = false;
            setRecoveryConfirming(false);
        }
    };
    useEffect(() => {
        if (props.sessionStatus !== 'unregistered'
            || joinContext !== null
            || joinProgress !== null
            || (props.access !== undefined && props.access?.joining !== true)
            || typeof props.getDeviceJoinStatus !== 'function') {
            setJoinCheck('ready');
            return;
        }
        let active = true;
        setJoinCheck('loading');
        void props.getDeviceJoinStatus().then((result) => {
            if (!active)
                return;
            if (!result.ok) {
                setError(result.error);
                setJoinCheck('error');
            }
            else {
                setJoinCheck('ready');
                if (result.value !== null)
                    setJoinProgress(result.value);
            }
        });
        return () => { active = false; };
    }, [props.sessionStatus, props.access]);
    useEffect(() => {
        if (joinProgress === null || joinProgress.completed || ['authorized', 'cancelled', 'rejected', 'expired'].includes(joinProgress.phase))
            return;
        let active = true;
        let inFlight = false;
        const poll = async () => {
            if (inFlight)
                return;
            inFlight = true;
            try {
                const result = await props.getDeviceJoinStatus();
                if (!active)
                    return;
                if (!result.ok)
                    setError(result.error);
                else if (result.value !== null)
                    setJoinProgress(result.value);
            }
            finally {
                inFlight = false;
            }
        };
        const timer = setInterval(() => { void poll(); }, 2_000);
        return () => {
            active = false;
            clearInterval(timer);
        };
    }, [joinProgress?.completed, joinProgress?.phase]);
    const login = async () => {
        setError(null);
        setLoginFailed(false);
        const result = await props.login();
        if (!result.ok) {
            setError(result.error);
            setLoginFailed(true);
        }
    };
    const clearLocalIdentity = async () => {
        setError(null);
        const result = await props.clearLocalIdentity();
        if (!result.ok) {
            setError(result.error);
            return;
        }
        setPhone('');
        setHandle('');
        resetIdentityEntry();
        setReplaceConfirmed(false);
        setLoginFailed(false);
        setSignedOutAlternative('none');
    };
    const prepareDeviceRejoin = async () => {
        const currentHandle = props.identity?.handle;
        if (currentHandle === undefined)
            return setError('当前设备缺少可重新加入的 Handle。');
        setError(null);
        const result = await props.retireDeviceIdentityForRejoin();
        if (!result.ok)
            return setError(result.error);
        setHandle(currentHandle);
        setDeviceRejoinHandle(currentHandle);
        resetIdentityEntry();
    };
    const signedOutRecoveryOpen = props.sessionStatus === 'signed-out' && signedOutAlternative === 'recover';
    const revokedHandle = props.sessionStatus === 'recovery-required' ? props.identity?.handle : undefined;
    if (props.recoveryOperationId !== null && !signedOutRecoveryOpen) {
        return (_jsx(Recovery, { ...props, onExit: exitRecovery, onExitLabel: props.sessionStatus === 'signed-out' ? '返回本机身份' : '返回身份入口', ...recoveryFactorContext === null ? {} : { initialFactorContext: recoveryFactorContext }, ...revokedHandle === undefined ? {} : {
                fixedHandle: revokedHandle,
                requestTitle: '需要重新恢复身份',
                requestDescription: '这个 Handle 已在另一台设备完成了更新恢复，当前设备的旧凭证因此失效。验证绑定手机号后即可继续使用本机数据。',
            } }));
    }
    if (!validRecoveryEntryOpen && ((props.access === null && props.accessLoading) || (props.access === null && props.accessError))) {
        return _jsxs(AwikiIdentityPage, { children: [_jsx("p", { role: "status", children: props.accessError ?? '正在确认本机身份操作…' }), props.accessError && _jsxs(_Fragment, { children: [props.sessionStatus === 'recovery-required' && _jsx("button", { type: "button", className: css.primary, disabled: props.accessLoading, onClick: () => { setRecoveryEntryOpen(true); }, children: "\u6062\u590D\u8EAB\u4EFD" }), _jsx("button", { type: "button", className: css.secondary, disabled: props.accessLoading, onClick: () => { void props.refreshIdentityAccess?.(); }, children: "\u91CD\u65B0\u68C0\u67E5\u8EAB\u4EFD\u72B6\u6001" })] })] });
    }
    if (!validRecoveryEntryOpen && props.accessError && props.recoveryOperationId === null) {
        return _jsxs(AwikiIdentityPage, { children: [_jsx("p", { role: "alert", children: props.accessError }), props.sessionStatus === 'recovery-required' && _jsx("button", { type: "button", className: css.primary, onClick: () => { setRecoveryEntryOpen(true); }, children: "\u6062\u590D\u8EAB\u4EFD" }), _jsx("button", { type: "button", className: css.secondary, onClick: () => { void props.refreshIdentityAccess?.(); }, children: "\u91CD\u65B0\u68C0\u67E5\u8EAB\u4EFD\u72B6\u6001" })] });
    }
    if (props.recoveryOperationId === null && recoveryChoice !== null && !recoveryRiskConfirmed) {
        return _jsx(AwikiIdentityPage, { onBack: cancelRecoveryChoice, backLabel: "\u8FD4\u56DE\u8BBE\u5907\u52A0\u5165", backDisabled: props.pending || recoveryConfirming, children: _jsxs("div", { className: css.accessFlow, children: [_jsx("div", { className: css.identityIcon, children: _jsx(IconUserOutline16, { size: 24 }) }), _jsxs("div", { className: css.headingGroup, children: [_jsx("h3", { children: "\u786E\u8BA4\u66FF\u6362\u6B64 Handle \u7684 DID" }), _jsx("p", { children: "\u6062\u590D\u4F1A\u4E3A\u8FD9\u4E2A Handle \u521B\u5EFA\u65B0\u7684 DID\uFF0C\u4F7F\u5176\u4ED6\u8BBE\u5907\u7684\u65E7\u51ED\u8BC1\u5931\u6548\u3002\u666E\u901A\u8BBE\u5907\u52A0\u5165\u4E0D\u4F1A\u66FF\u6362 DID\uFF0C\u901A\u5E38\u5E94\u4F18\u5148\u4F7F\u7528\u3002" })] }), _jsxs("div", { className: css.dangerPanel, children: [_jsx("strong", { children: recoveryChoice }), _jsx("p", { children: "\u53EA\u6709\u5728\u65E0\u6CD5\u901A\u8FC7\u5DF2\u6709\u7BA1\u7406\u8BBE\u5907\u5B8C\u6210\u666E\u901A\u52A0\u5165\u65F6\uFF0C\u624D\u7EE7\u7EED\u6062\u590D\u3002" })] }), _jsx("button", { type: "button", className: css.dangerButton, disabled: props.pending || recoveryConfirming, onClick: () => { void confirmRecoveryChoice(); }, children: "\u53D1\u9001\u6062\u590D\u9A8C\u8BC1\u7801\u5E76\u66FF\u6362 DID" }), _jsx("button", { type: "button", className: css.secondary, disabled: props.pending || recoveryConfirming, onClick: cancelRecoveryChoice, children: "\u53D6\u6D88\uFF0C\u8FD4\u56DE\u666E\u901A\u52A0\u5165" }), error !== null && _jsx("small", { className: css.error, role: "alert", children: error })] }) });
    }
    if (props.recoveryOperationId === null && recoveryChoice !== null) {
        return _jsx(Recovery, { ...props, requestError: error, fixedHandle: recoveryChoice, onExit: exitRecovery, ...recoveryFactorContext === null ? {} : { initialFactorContext: recoveryFactorContext } });
    }
    if (props.recoveryOperationId === null && joinContext === null && joinProgress === null && joinCheck !== 'ready' && props.sessionStatus === 'unregistered') {
        return _jsxs(AwikiIdentityPage, { children: [_jsx("p", { role: joinCheck === 'error' ? 'alert' : 'status', children: joinCheck === 'error' ? error : '正在确认设备加入状态…' }), joinCheck === 'error' && _jsx("button", { type: "button", className: css.primary, onClick: () => {
                        setJoinCheck('loading');
                        void props.getDeviceJoinStatus().then(result => {
                            if (!result.ok) {
                                setError(result.error);
                                setJoinCheck('error');
                            }
                            else {
                                setJoinProgress(result.value);
                                setJoinCheck('ready');
                            }
                        });
                    }, children: "\u91CD\u65B0\u68C0\u67E5\u52A0\u5165\u72B6\u6001" })] });
    }
    if (props.sessionStatus === 'recovery-required') {
        return (_jsx(Recovery, { ...props, ...validRecoveryEntryOpen ? { onExit: () => { setRecoveryEntryOpen(false); }, onExitLabel: '返回身份检查' } : {}, ...revokedHandle === undefined ? {} : { fixedHandle: revokedHandle }, requestTitle: "\u9700\u8981\u91CD\u65B0\u6062\u590D\u8EAB\u4EFD", requestDescription: "\u8FD9\u4E2A Handle \u5DF2\u5728\u53E6\u4E00\u53F0\u8BBE\u5907\u5B8C\u6210\u4E86\u66F4\u65B0\u6062\u590D\uFF0C\u5F53\u524D\u8BBE\u5907\u7684\u65E7\u51ED\u8BC1\u56E0\u6B64\u5931\u6548\u3002\u53D1\u9001\u9A8C\u8BC1\u7801\u4F1A\u5F00\u59CB\u4E00\u6B21\u66FF\u6362 DID \u7684\u6062\u590D\uFF1B\u8BF7\u786E\u8BA4\u540E\u518D\u7EE7\u7EED\u3002" }));
    }
    if (props.sessionStatus === 'device-rejoin-required') {
        return (_jsx(AwikiIdentityPage, { children: _jsxs("div", { className: css.accessFlow, children: [_jsx("div", { className: css.identityIcon, children: _jsx(IconUserOutline16, { size: 24 }) }), _jsxs("div", { className: css.headingGroup, children: [_jsx("h3", { children: "\u6B64\u8BBE\u5907\u5DF2\u88AB\u64A4\u9500" }), _jsx("p", { children: "\u8FD9\u53F0\u8BBE\u5907\u7684\u65E7\u51ED\u8BC1\u5DF2\u6C38\u4E45\u5931\u6548\u3002\u53EF\u4EE5\u4FDD\u7559\u672C\u673A\u6D88\u606F\u6570\u636E\uFF0C\u91CD\u65B0\u9A8C\u8BC1\u624B\u673A\u53F7\u5E76\u5411\u7BA1\u7406\u8BBE\u5907\u91CD\u65B0\u7533\u8BF7\u52A0\u5165\u3002" })] }), props.identity?.handle !== undefined && _jsxs("div", { className: css.identitySummary, children: [_jsx("span", { children: "\u5F53\u524D\u8EAB\u4EFD" }), _jsx("strong", { children: props.identity.handle })] }), _jsx("button", { type: "button", className: css.primary, disabled: props.pending, onClick: () => { void prepareDeviceRejoin(); }, children: "\u91CD\u65B0\u52A0\u5165\u6B64\u8BBE\u5907" }), error !== null && _jsx("small", { className: css.error, role: "alert", children: error })] }) }));
    }
    if (props.sessionStatus === 'unregistered' && joinProgress !== null) {
        const terminal = ['cancelled', 'rejected', 'expired'].includes(joinProgress.phase);
        return (_jsx(AwikiIdentityPage, { children: _jsxs("div", { className: css.accessFlow, children: [_jsx("div", { className: css.identityIcon, children: _jsx(IconUserOutline16, { size: 24 }) }), _jsxs("div", { className: css.headingGroup, children: [_jsx("h3", { children: joinProgress.phase === 'sas-ready' ? '核对安全码' : terminal ? '设备加入已结束' : '正在加入设备' }), _jsx("p", { children: joinProgress.phase === 'sas-ready'
                                    ? '请在已有管理设备上核对下面的 6 位安全码；只有两端一致时才批准。'
                                    : joinProgress.phase === 'rejected'
                                        ? '管理设备拒绝了这次加入。'
                                        : joinProgress.phase === 'expired'
                                            ? '这次设备加入已过期，请重新验证手机号。'
                                            : joinProgress.phase === 'cancelled'
                                                ? '这次设备加入已取消。'
                                                : '请在已有 AWiki Me 或 CLI 管理设备上处理加入请求。' })] }), joinProgress.phase === 'sas-ready' && _jsx("strong", { className: css.sas, children: joinProgress.sas }), !terminal && _jsxs("small", { className: css.notice, role: "status", children: ["\u6709\u6548\u671F\u81F3 ", joinProgress.expiresAt] }), _jsx("button", { type: "button", className: terminal ? css.primary : css.secondary, disabled: props.pending, onClick: () => { void cancelJoin(); }, children: terminal ? '返回身份入口' : '取消加入' }), error !== null && _jsx("small", { className: css.error, role: "alert", children: error })] }) }));
    }
    if (props.sessionStatus === 'unregistered' && joinContext !== null) {
        return (_jsx(AwikiIdentityPage, { children: _jsxs("div", { className: css.accessFlow, children: [_jsx("div", { className: css.identityIcon, children: _jsx(IconUserOutline16, { size: 24 }) }), _jsxs("div", { className: css.headingGroup, children: [_jsx("h3", { children: "\u8FD9\u4E2A Handle \u5DF2\u5B58\u5728" }), _jsx("p", { children: "\u63A8\u8350\u628A\u5F53\u524D DSH \u4F5C\u4E3A\u65B0\u8BBE\u5907\u52A0\u5165\uFF0C\u539F\u8EAB\u4EFD\u548C\u5176\u4ED6\u8BBE\u5907\u4F1A\u7EE7\u7EED\u6709\u6548\u3002" })] }), _jsx("button", { type: "button", className: css.primary, disabled: props.pending, onClick: () => { void beginJoin(); }, children: "\u52A0\u5165\u65B0\u8BBE\u5907\uFF08\u63A8\u8350\uFF09" }), _jsx("button", { type: "button", className: css.dangerLink, disabled: props.pending, onClick: chooseRecovery, children: "\u6062\u590D Handle\uFF08\u4F1A\u66FF\u6362 DID\uFF09" }), _jsx("button", { type: "button", className: css.secondary, disabled: props.pending, onClick: () => { void cancelJoin(); }, children: "\u53D6\u6D88" }), error !== null && _jsx("small", { className: css.error, role: "alert", children: error })] }) }));
    }
    if (props.sessionStatus === 'signed-out') {
        if (signedOutAlternative === 'recover') {
            return _jsx(Recovery, { ...props, onExit: exitRecovery, onExitLabel: "\u8FD4\u56DE\u672C\u673A\u8EAB\u4EFD" });
        }
        if (signedOutAlternative === 'replace') {
            return (_jsx(AwikiIdentityPage, { onBack: returnToSignedOutHome, backLabel: "\u8FD4\u56DE\u672C\u673A\u8EAB\u4EFD", backDisabled: props.pending, children: _jsxs("div", { className: css.accessFlow, children: [_jsx("div", { className: css.identityIcon, children: _jsx(IconUserOutline16, { size: 24 }) }), _jsxs("div", { className: css.headingGroup, children: [_jsx("h3", { children: "\u4F7F\u7528\u5176\u4ED6\u8EAB\u4EFD" }), _jsx("p", { children: "\u7EE7\u7EED\u524D\u9700\u8981\u5148\u6E05\u9664\u8FD9\u53F0\u8BBE\u5907\u4E0A\u4FDD\u7559\u7684 AWiki \u8EAB\u4EFD\u548C\u672C\u5730\u6570\u636E\u3002" })] }), _jsxs("div", { className: css.dangerPanel, children: [_jsx("strong", { children: "\u6B64\u64CD\u4F5C\u53EA\u6E05\u9664\u672C\u673A\u6570\u636E\uFF0C\u5E76\u4E14\u65E0\u6CD5\u64A4\u9500" }), _jsx("p", { children: "\u672C\u673A\u79C1\u94A5\u3001\u6D88\u606F\u3001\u9644\u4EF6\u7D22\u5F15\u548C\u8EAB\u4EFD\u7F13\u5B58\u5C06\u6C38\u4E45\u5220\u9664\uFF1B\u670D\u52A1\u7AEF\u8D26\u6237\u4E0D\u4F1A\u5220\u9664\uFF0C\u4F46\u672C\u5730\u6570\u636E\u65E0\u6CD5\u6062\u590D\u3002" }), _jsxs("label", { className: css.confirmation, children: [_jsx("input", { type: "checkbox", checked: replaceConfirmed, onChange: event => { setReplaceConfirmed(event.target.checked); } }), _jsx("span", { children: "\u6211\u5DF2\u4E86\u89E3\u672C\u5730\u6570\u636E\u4F1A\u88AB\u6C38\u4E45\u6E05\u9664" })] })] }), _jsx("button", { type: "button", className: css.dangerButton, disabled: props.pending || !replaceConfirmed, onClick: () => { void clearLocalIdentity(); }, children: "\u6E05\u9664\u5E76\u4F7F\u7528\u5176\u4ED6\u8EAB\u4EFD" }), error !== null && _jsx("small", { className: css.error, role: "alert", children: error })] }) }));
        }
        return (_jsx(AwikiIdentityPage, { children: _jsxs("div", { className: css.accessFlow, children: [_jsx("div", { className: css.identityIcon, children: _jsx(IconUserOutline16, { size: 24 }) }), _jsxs("div", { className: css.headingGroup, children: [_jsx("h3", { children: "\u5DF2\u9000\u51FA AWiki" }), _jsx("p", { children: "\u8FD9\u53F0\u8BBE\u5907\u4ECD\u5B89\u5168\u4FDD\u7559\u539F\u8EAB\u4EFD\u548C\u672C\u5730\u6D88\u606F\uFF0C\u91CD\u65B0\u8FDB\u5165\u4E0D\u4F1A\u521B\u5EFA\u65B0\u8EAB\u4EFD\u3002" })] }), _jsxs("div", { className: css.actionStack, children: [_jsx("button", { type: "button", className: css.primary, disabled: props.pending, onClick: () => { void login(); }, children: "\u91CD\u65B0\u8FDB\u5165\u672C\u673A\u8EAB\u4EFD" }), _jsx("button", { type: "button", className: css.dangerLink, disabled: props.pending, onClick: () => { setSignedOutAlternative('replace'); setLoginFailed(false); setError(null); }, children: "\u4F7F\u7528\u5176\u4ED6\u8EAB\u4EFD" })] }), error !== null && _jsx("small", { className: css.error, role: "alert", children: error }), loginFailed && (_jsxs("div", { className: css.recoveryHelp, children: [_jsx("p", { children: "\u5982\u679C\u672C\u673A\u8EAB\u4EFD\u51ED\u8BC1\u5DF2\u7ECF\u635F\u574F\u6216\u4E0D\u53EF\u7528\uFF0C\u53EF\u4EE5\u9A8C\u8BC1\u539F\u7ED1\u5B9A\u624B\u673A\u53F7\u540E\u6062\u590D\u8FD9\u4E2A\u8EAB\u4EFD\u3002" }), _jsx("button", { type: "button", className: css.secondary, disabled: props.pending, onClick: () => { setSignedOutAlternative('recover'); setError(null); }, children: "\u6062\u590D\u672C\u673A\u539F\u6709\u8EAB\u4EFD" })] }))] }) }));
    }
    return (_jsx(AwikiIdentityPage, { ...registrationOtpSent ? { onBack: resetIdentityEntry, backLabel: '修改身份信息' } : {}, backDisabled: props.pending, children: _jsxs("form", { className: css.accessFlow, onSubmit: (event) => { event.preventDefault(); void (registrationOtpSent ? completeRegistration() : requestIdentityOtp()); }, children: [_jsx("div", { className: css.identityIcon, children: _jsx(IconUserOutline16, { size: 24 }) }), _jsxs("div", { className: css.headingGroup, children: [_jsx("h3", { children: registrationOtpSent ? '验证身份' : deviceRejoinHandle === null ? '进入 AWiki' : '重新加入设备' }), _jsx("p", { children: registrationOtpSent
                                ? '输入注册验证码。新 Handle 会创建身份，已有 Handle 会进入设备加入选择。'
                                : deviceRejoinHandle === null
                                    ? '输入 Handle 和手机号继续。已有恢复进度会直接继续，无需重复获取验证码。'
                                    : '验证绑定手机号后，这台设备会以一把新密钥重新申请加入；本机消息数据不会清除。' })] }), _jsxs("label", { className: css.field, children: ["Handle", _jsx("input", { value: handle, onChange: event => { setHandle(event.target.value); setShortHandleInviteNotice(false); }, readOnly: registrationOtpSent || deviceRejoinHandle !== null, autoComplete: "username", placeholder: "\u4F8B\u5982 alice", autoFocus: props.autoFocusHandle })] }), _jsxs("label", { className: css.field, children: ["\u624B\u673A\u53F7", _jsx("input", { value: phone, onChange: event => { setPhone(event.target.value); }, readOnly: registrationOtpSent, type: "tel", autoComplete: "tel" })] }), registrationOtpSent && _jsxs("label", { className: css.field, children: ["\u6CE8\u518C\u9A8C\u8BC1\u7801", _jsx("input", { value: otp, onChange: event => { setOtp(event.target.value); }, inputMode: "numeric", autoComplete: "one-time-code", autoFocus: true })] }), _jsx("button", { type: "submit", className: css.primary, disabled: props.pending || props.accessLoading || handle.trim() === '' || phone.trim() === '' || (registrationOtpSent && otp.trim() === ''), children: registrationOtpSent ? '继续' : '获取验证码' }), registrationOtpSent && (_jsx("button", { type: "button", className: css.linkButton, disabled: props.pending || retrySeconds > 0, onClick: () => { void requestRegistrationOtp(); }, children: retrySeconds > 0 ? `${retrySeconds} 秒后重新获取` : '重新获取注册验证码' })), shortHandleInviteNotice && _jsx("div", { className: css.inviteNotice, role: "alert", children: SHORT_HANDLE_INVITE_MESSAGE }), notice !== null && _jsx("small", { className: css.notice, role: "status", children: notice }), error !== null && _jsx("small", { className: css.error, role: "alert", children: error })] }) }));
}
//# sourceMappingURL=AwikiIdentityAccess.js.map