import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** One explicit create, recover, resume, or replace flow for AWiki identity access. */
import { useEffect, useState } from 'react';
import { IconUserOutline16 } from '@deepseek-ai/dsh-client-ui-primitives';
import { AwikiIdentityPage } from "./AwikiIdentityPage.js";
import { AwikiRecoveryForm, } from "./AwikiRecoveryForm.js";
import css from './AwikiIdentityAccess.module.css';
function Recovery(props) {
    return (_jsx(AwikiRecoveryForm, { operationId: props.recoveryOperationId, progress: props.recoveryProgress, pending: props.pending, sendRecoveryOtp: props.sendRecoveryOtp, prepareRecovery: props.prepareRecovery, activateRecovery: props.activateRecovery, refreshRecoveryStatus: props.refreshRecoveryStatus, resumeRecovery: props.resumeRecovery, discardRecovery: props.discardRecovery, ...props.onExit === undefined ? {} : { onExit: props.onExit }, ...props.onExitLabel === undefined ? {} : { onExitLabel: props.onExitLabel }, ...props.initialFactorContext === undefined ? {} : { initialFactorContext: props.initialFactorContext }, ...props.fixedHandle === undefined ? {} : { fixedHandle: props.fixedHandle }, ...props.requestTitle === undefined ? {} : { requestTitle: props.requestTitle }, ...props.requestDescription === undefined ? {} : { requestDescription: props.requestDescription } }));
}
/** Keep phone and OTP values mounted only for the duration of this explicit user flow. */
export function AwikiIdentityAccess(props) {
    const [phone, setPhone] = useState('');
    const [handle, setHandle] = useState('');
    const [otp, setOtp] = useState('');
    const [registrationOtpSent, setRegistrationOtpSent] = useState(false);
    const [recoveryFactorContext, setRecoveryFactorContext] = useState(null);
    const [notice, setNotice] = useState(null);
    const [error, setError] = useState(null);
    const [retryDeadline, setRetryDeadline] = useState(null);
    const [retrySeconds, setRetrySeconds] = useState(0);
    const [signedOutAlternative, setSignedOutAlternative] = useState('none');
    const [replaceConfirmed, setReplaceConfirmed] = useState(false);
    const [loginFailed, setLoginFailed] = useState(false);
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
    const resetIdentityEntry = () => {
        setOtp('');
        setRegistrationOtpSent(false);
        setRecoveryFactorContext(null);
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
    const requestRegistrationOtp = async () => {
        setError(null);
        const result = await props.sendRegistrationOtp({ handle: handle.trim(), phone: phone.trim() });
        if (!result.ok) {
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
        setNotice(null);
        const requestedHandle = handle.trim();
        const requestedPhone = phone.trim();
        const inspection = await props.inspectIdentityAccess({ handle: requestedHandle });
        if (!inspection.ok) {
            setError(inspection.error);
            return;
        }
        if (inspection.value.status === 'existing') {
            const factorContext = { fullHandle: inspection.value.fullHandle, phone: requestedPhone };
            setRecoveryFactorContext(factorContext);
            const recovery = await props.sendRecoveryOtp(factorContext);
            if (!recovery.ok) {
                setRecoveryFactorContext(null);
                setError(recovery.error);
                return;
            }
            setRecoveryFactorContext({ fullHandle: recovery.value.fullHandle, phone: requestedPhone });
            return;
        }
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
            setError(result.error);
            return;
        }
        setPhone('');
        setHandle('');
        resetIdentityEntry();
    };
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
    const signedOutRecoveryOpen = props.sessionStatus === 'signed-out' && signedOutAlternative === 'recover';
    const revokedHandle = props.sessionStatus === 'recovery-required' ? props.identity?.handle : undefined;
    if (props.recoveryOperationId !== null && !signedOutRecoveryOpen) {
        const onExit = props.sessionStatus === 'signed-out' ? returnToSignedOutHome : resetIdentityEntry;
        return (_jsx(Recovery, { ...props, onExit: onExit, onExitLabel: props.sessionStatus === 'signed-out' ? '返回本机身份' : '返回身份入口', ...recoveryFactorContext === null ? {} : { initialFactorContext: recoveryFactorContext }, ...revokedHandle === undefined ? {} : {
                fixedHandle: revokedHandle,
                requestTitle: '需要重新恢复身份',
                requestDescription: '这个 Handle 已在另一台设备完成了更新恢复，当前设备的旧凭证因此失效。验证绑定手机号后即可继续使用本机数据。',
            } }));
    }
    if (props.sessionStatus === 'recovery-required') {
        return (_jsx(Recovery, { ...props, ...revokedHandle === undefined ? {} : { fixedHandle: revokedHandle }, requestTitle: "\u9700\u8981\u91CD\u65B0\u6062\u590D\u8EAB\u4EFD", requestDescription: "\u8FD9\u4E2A Handle \u5DF2\u5728\u53E6\u4E00\u53F0\u8BBE\u5907\u5B8C\u6210\u4E86\u66F4\u65B0\u6062\u590D\uFF0C\u5F53\u524D\u8BBE\u5907\u7684\u65E7\u51ED\u8BC1\u56E0\u6B64\u5931\u6548\u3002\u9A8C\u8BC1\u7ED1\u5B9A\u624B\u673A\u53F7\u540E\u5373\u53EF\u7EE7\u7EED\u4F7F\u7528\u672C\u673A\u6570\u636E\u3002" }));
    }
    if (props.sessionStatus === 'signed-out') {
        if (signedOutAlternative === 'recover') {
            return _jsx(Recovery, { ...props, onExit: returnToSignedOutHome, onExitLabel: "\u8FD4\u56DE\u672C\u673A\u8EAB\u4EFD" });
        }
        if (signedOutAlternative === 'replace') {
            return (_jsx(AwikiIdentityPage, { onBack: returnToSignedOutHome, backLabel: "\u8FD4\u56DE\u672C\u673A\u8EAB\u4EFD", backDisabled: props.pending, children: _jsxs("div", { className: css.accessFlow, children: [_jsx("div", { className: css.identityIcon, children: _jsx(IconUserOutline16, { size: 24 }) }), _jsxs("div", { className: css.headingGroup, children: [_jsx("h3", { children: "\u4F7F\u7528\u5176\u4ED6\u8EAB\u4EFD" }), _jsx("p", { children: "\u7EE7\u7EED\u524D\u9700\u8981\u5148\u6E05\u9664\u8FD9\u53F0\u8BBE\u5907\u4E0A\u4FDD\u7559\u7684 AWiki \u8EAB\u4EFD\u548C\u672C\u5730\u6570\u636E\u3002" })] }), _jsxs("div", { className: css.dangerPanel, children: [_jsx("strong", { children: "\u6B64\u64CD\u4F5C\u53EA\u6E05\u9664\u672C\u673A\u6570\u636E\uFF0C\u5E76\u4E14\u65E0\u6CD5\u64A4\u9500" }), _jsx("p", { children: "\u672C\u673A\u79C1\u94A5\u3001\u6D88\u606F\u3001\u9644\u4EF6\u7D22\u5F15\u548C\u8EAB\u4EFD\u7F13\u5B58\u5C06\u6C38\u4E45\u5220\u9664\uFF1B\u670D\u52A1\u7AEF\u8D26\u6237\u4E0D\u4F1A\u5220\u9664\uFF0C\u4F46\u672C\u5730\u6570\u636E\u65E0\u6CD5\u6062\u590D\u3002" }), _jsxs("label", { className: css.confirmation, children: [_jsx("input", { type: "checkbox", checked: replaceConfirmed, onChange: event => { setReplaceConfirmed(event.target.checked); } }), _jsx("span", { children: "\u6211\u5DF2\u4E86\u89E3\u672C\u5730\u6570\u636E\u4F1A\u88AB\u6C38\u4E45\u6E05\u9664" })] })] }), _jsx("button", { type: "button", className: css.dangerButton, disabled: props.pending || !replaceConfirmed, onClick: () => { void clearLocalIdentity(); }, children: "\u6E05\u9664\u5E76\u4F7F\u7528\u5176\u4ED6\u8EAB\u4EFD" }), error !== null && _jsx("small", { className: css.error, role: "alert", children: error })] }) }));
        }
        return (_jsx(AwikiIdentityPage, { children: _jsxs("div", { className: css.accessFlow, children: [_jsx("div", { className: css.identityIcon, children: _jsx(IconUserOutline16, { size: 24 }) }), _jsxs("div", { className: css.headingGroup, children: [_jsx("h3", { children: "\u5DF2\u9000\u51FA AWiki" }), _jsx("p", { children: "\u8FD9\u53F0\u8BBE\u5907\u4ECD\u5B89\u5168\u4FDD\u7559\u539F\u8EAB\u4EFD\u548C\u672C\u5730\u6D88\u606F\uFF0C\u91CD\u65B0\u8FDB\u5165\u4E0D\u4F1A\u521B\u5EFA\u65B0\u8EAB\u4EFD\u3002" })] }), _jsxs("div", { className: css.actionStack, children: [_jsx("button", { type: "button", className: css.primary, disabled: props.pending, onClick: () => { void login(); }, children: "\u91CD\u65B0\u8FDB\u5165\u672C\u673A\u8EAB\u4EFD" }), _jsx("button", { type: "button", className: css.dangerLink, disabled: props.pending, onClick: () => { setSignedOutAlternative('replace'); setLoginFailed(false); setError(null); }, children: "\u4F7F\u7528\u5176\u4ED6\u8EAB\u4EFD" })] }), error !== null && _jsx("small", { className: css.error, role: "alert", children: error }), loginFailed && (_jsxs("div", { className: css.recoveryHelp, children: [_jsx("p", { children: "\u5982\u679C\u672C\u673A\u8EAB\u4EFD\u51ED\u8BC1\u5DF2\u7ECF\u635F\u574F\u6216\u4E0D\u53EF\u7528\uFF0C\u53EF\u4EE5\u9A8C\u8BC1\u539F\u7ED1\u5B9A\u624B\u673A\u53F7\u540E\u6062\u590D\u8FD9\u4E2A\u8EAB\u4EFD\u3002" }), _jsx("button", { type: "button", className: css.secondary, disabled: props.pending, onClick: () => { setSignedOutAlternative('recover'); setError(null); }, children: "\u6062\u590D\u672C\u673A\u539F\u6709\u8EAB\u4EFD" })] }))] }) }));
    }
    return (_jsx(AwikiIdentityPage, { ...registrationOtpSent ? { onBack: resetIdentityEntry, backLabel: '修改身份信息' } : {}, backDisabled: props.pending, children: _jsxs("form", { className: css.accessFlow, onSubmit: (event) => { event.preventDefault(); void (registrationOtpSent ? completeRegistration() : requestIdentityOtp()); }, children: [_jsx("div", { className: css.identityIcon, children: _jsx(IconUserOutline16, { size: 24 }) }), _jsxs("div", { className: css.headingGroup, children: [_jsx("h3", { children: registrationOtpSent ? '创建新身份' : '进入 AWiki' }), _jsx("p", { children: registrationOtpSent
                                ? '这个 Handle 尚未注册。输入刚收到的验证码以创建身份。'
                                : '输入 Handle 和手机号。已有 Handle 会恢复身份，新 Handle 会创建身份。' })] }), props.legacySharedStateDetected === true && props.profileName != null && (_jsxs("div", { className: css.existingNotice, role: "status", children: [_jsx("strong", { children: "\u5DF2\u4E3A\u5F53\u524D Profile \u9694\u79BB AWiki \u6570\u636E" }), _jsxs("p", { children: ["\u68C0\u6D4B\u5230\u65E7\u7248\u5171\u4EAB\u6570\u636E\u3002\u4E3A\u907F\u514D\u591A\u4E2A DSH Profile \u540C\u65F6\u5360\u7528\u6570\u636E\u5E93\uFF0C\u5F53\u524D Profile\u300C", props.profileName, "\u300D\u4F7F\u7528\u72EC\u7ACB\u6570\u636E\u76EE\u5F55\uFF1B\u65E7\u6570\u636E\u672A\u5220\u9664\u6216\u590D\u5236\u3002\u8BF7\u7528\u539F Handle \u548C\u624B\u673A\u53F7\u6062\u590D\u5230\u6B64\u8BBE\u5907\u3002"] })] })), _jsxs("label", { className: css.field, children: ["Handle", _jsx("input", { value: handle, onChange: event => { setHandle(event.target.value); }, readOnly: registrationOtpSent, autoComplete: "username", placeholder: "\u4F8B\u5982 alice", autoFocus: props.autoFocusHandle })] }), _jsxs("label", { className: css.field, children: ["\u624B\u673A\u53F7", _jsx("input", { value: phone, onChange: event => { setPhone(event.target.value); }, readOnly: registrationOtpSent, type: "tel", autoComplete: "tel" })] }), registrationOtpSent && _jsxs("label", { className: css.field, children: ["\u6CE8\u518C\u9A8C\u8BC1\u7801", _jsx("input", { value: otp, onChange: event => { setOtp(event.target.value); }, inputMode: "numeric", autoComplete: "one-time-code", autoFocus: true })] }), _jsx("button", { type: "submit", className: css.primary, disabled: props.pending || handle.trim() === '' || phone.trim() === '' || (registrationOtpSent && otp.trim() === ''), children: registrationOtpSent ? '创建身份' : '获取验证码' }), registrationOtpSent && (_jsx("button", { type: "button", className: css.linkButton, disabled: props.pending || retrySeconds > 0, onClick: () => { void requestRegistrationOtp(); }, children: retrySeconds > 0 ? `${retrySeconds} 秒后重新获取` : '重新获取注册验证码' })), notice !== null && _jsx("small", { className: css.notice, role: "status", children: notice }), error !== null && _jsx("small", { className: css.error, role: "alert", children: error })] }) }));
}
//# sourceMappingURL=AwikiIdentityAccess.js.map