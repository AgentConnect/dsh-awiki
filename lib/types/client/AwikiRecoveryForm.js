import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useRecoveryOtpCooldown } from "./otp-cooldown.js";
import { useDraftState } from "./drafts.js";
import { useEffect, useRef } from 'react';
import { IconCheckOutline16, IconLoadingOutline16, IconRefreshOutline16, IconUserOutline16, IconWarningOutline16, } from '@deepseek-ai/dsh-client-ui-primitives';
import { AwikiIdentityPage } from "./AwikiIdentityPage.js";
import css from './AwikiOverlay.module.css';
function phaseLabel(phase) {
    switch (phase) {
        case 'awaiting_factor': return '等待验证码验证';
        case 'ready_to_commit': return '等待最终确认';
        case 'remote_outcome_unknown': return '远端结果待确认';
        case 'remote_committed': return '身份已在远端恢复';
        case 'identity_transition_pending': return '正在切换本机身份';
        case 'applied': return '身份恢复完成';
        case 'quarantined_key_unavailable': return '新身份凭证暂不可用';
    }
}
function canResume(progress) {
    return progress.allowedActions?.includes('resume') === true;
}
function maskedPhone(value) {
    const normalized = value.replace(/[\s()-]/g, '');
    if (normalized.length <= 7)
        return normalized;
    return `${normalized.slice(0, 3)}****${normalized.slice(-4)}`;
}
function progressMessage(progress) {
    if (progress.failureCode === 'local_transition_superseded')
        return '此恢复操作已由更新的身份状态关闭。请返回身份入口重新检查当前身份。';
    switch (progress.phase) {
        case 'remote_outcome_unknown': return '恢复请求已经提交，正在确认服务端结果。请不要重新发起恢复。';
        case 'remote_committed': return '身份已在服务端恢复，正在为当前设备更新本机凭证。';
        case 'identity_transition_pending': return '身份已在服务端恢复，本机切换尚未完成。请继续完成本机切换。';
        case 'quarantined_key_unavailable': return '新的本机凭证暂时不可用，请稍后重新检查恢复结果。';
        case 'applied': return '身份已经恢复完成。';
        default: return '请根据当前状态继续操作，也可以返回入口稍后处理。';
    }
}
function RecoveryDiagnostics(props) {
    return (_jsxs("details", { className: css.recoveryDiagnostics, children: [_jsx("summary", { children: "\u8BCA\u65AD\u4FE1\u606F" }), _jsxs("dl", { children: [_jsxs("div", { children: [_jsx("dt", { children: "\u6062\u590D\u8BF7\u6C42\u7F16\u53F7" }), _jsx("dd", { children: _jsx("code", { children: props.operationId }) })] }), props.failureCode !== undefined && _jsxs("div", { children: [_jsx("dt", { children: "\u72B6\u6001\u4EE3\u7801" }), _jsx("dd", { children: _jsx("code", { children: props.failureCode }) })] })] })] }));
}
/** Status-first Handle recovery. Secret inputs stay in browser memory only. */
export function AwikiRecoveryForm(props) {
    const cooldown = useRecoveryOtpCooldown();
    const handle = useRef(null);
    const requestPhone = useRef(null);
    const factorPhone = useRef(null);
    const otp = useRef(null);
    const [handleDraft, setHandleDraft] = useDraftState('recovery:handle', props.fixedHandle ?? '');
    const targetHandle = props.progress?.fullHandle ?? props.fixedHandle ?? props.initialFactorContext?.fullHandle ?? handleDraft;
    const initialContext = props.initialFactorContext?.fullHandle === targetHandle ? props.initialFactorContext : undefined;
    const [phoneDraft, setPhoneDraft] = useDraftState(`recovery:${targetHandle}:phone`, initialContext?.phone ?? '');
    const [otpDraft, setOtpDraft] = useDraftState(`recovery:${props.operationId}:otp`, '');
    const [autoAttempt, setAutoAttempt] = useDraftState(`recovery:${props.operationId}:autoAttempt`, false, false);
    const [commitAttempted, setCommitAttempted] = useDraftState(`recovery:${props.operationId}:commitAttempted`, false, false);
    const [factorContext, setFactorContext] = useDraftState(`recovery:${targetHandle}:factorContext`, null, false);
    const [notice, setNotice] = useDraftState(`recovery:${props.operationId}:notice`, null, false);
    const [error, setError] = useDraftState(`recovery:${props.operationId}:error`, null, false);
    const effectiveFactorContext = factorContext ?? initialContext ?? null;
    useEffect(() => {
        setNotice(null);
        setError(null);
    }, [props.operationId]);
    useEffect(() => {
        const progress = props.progress;
        if (progress === null
            || !canResume(progress)
            || progress.phase === 'awaiting_factor'
            || progress.phase === 'ready_to_commit'
            || progress.phase === 'applied'
            || progress.phase === 'quarantined_key_unavailable'
            || props.pending
            || props.statusError
            || autoAttempt
            || error !== null)
            return;
        const timer = setTimeout(() => {
            setAutoAttempt(true);
            void (canResume(progress) ? resume() : refresh());
        }, 900);
        return () => { clearTimeout(timer); };
    }, [error, props.pending, props.progress, props.statusError, autoAttempt]);
    const sendOtp = async (fullHandle, phone) => {
        setError(null);
        const result = await props.sendRecoveryOtp({
            fullHandle,
            phone,
        });
        if (!result.ok) {
            setError(result.error);
            return;
        }
        cooldown.start(result.value.retryAfterSeconds);
        setOtpDraft('');
        setFactorContext({ fullHandle: result.value.fullHandle, phone });
        setNotice('恢复验证码已发送。');
    };
    const requestOtp = async () => {
        const fullHandle = props.fixedHandle?.trim() ?? handleDraft.trim();
        const phone = phoneDraft.trim();
        const continued = await props.continueRecoveryForHandle?.(fullHandle);
        if (continued !== undefined && !continued.ok)
            return setError(continued.error);
        if (continued?.ok && continued.value)
            return;
        await sendOtp(fullHandle, phone);
    };
    const resendOtp = async () => {
        if (props.progress?.allowedActions?.includes('request_otp') !== true || props.pending)
            return;
        const fullHandle = effectiveFactorContext?.fullHandle ?? props.progress?.fullHandle;
        if (fullHandle === undefined)
            return;
        await sendOtp(fullHandle, effectiveFactorContext?.phone ?? phoneDraft.trim());
    };
    const prepare = async () => {
        if (props.progress?.allowedActions?.includes('prepare') !== true || props.pending)
            return;
        setError(null);
        const result = await props.prepareRecovery({
            phone: effectiveFactorContext?.phone ?? phoneDraft.trim(),
            otp: otpDraft.trim(),
        });
        setOtpDraft('');
        if (!result.ok) {
            setError(result.error);
            return;
        }
        setNotice(null);
    };
    const activate = async () => {
        if (props.progress?.allowedActions?.includes('activate') !== true || props.pending)
            return;
        setCommitAttempted(true);
        setError(null);
        const result = await props.activateRecovery();
        if (!result.ok) {
            setError(result.error);
        }
    };
    const refresh = async () => {
        setError(null);
        const result = await props.refreshRecoveryStatus();
        if (!result.ok) {
            setError(result.error);
            return;
        }
        if (result.value.allowedActions?.includes('discard_pre_attempt'))
            setCommitAttempted(false);
    };
    const resume = async () => {
        setError(null);
        const result = await props.resumeRecovery();
        if (!result.ok) {
            setError(result.error);
            return;
        }
        if (result.value.allowedActions?.includes('discard_pre_attempt'))
            setCommitAttempted(false);
    };
    const discard = async () => {
        if (props.progress?.allowedActions?.includes('discard_pre_attempt') !== true || props.pending)
            return;
        setError(null);
        const result = await props.discardRecovery();
        if (!result.ok) {
            setError(result.error);
            return;
        }
        setHandleDraft('');
        setPhoneDraft('');
        setOtpDraft('');
        setFactorContext(null);
        props.onExit?.();
    };
    if (props.operationId === null) {
        return (_jsx(AwikiIdentityPage, { ...props.onExit === undefined ? {} : { onBack: props.onExit }, backLabel: props.onExitLabel ?? '返回身份入口', backDisabled: false, children: _jsxs("form", { className: css.recoveryForm, onSubmit: (event) => { event.preventDefault(); void requestOtp(); }, children: [_jsx("div", { className: css.registrationIcon, children: _jsx(IconUserOutline16, { size: 24 }) }), _jsx("h3", { children: props.requestTitle ?? '恢复已有身份' }), _jsx("p", { children: props.requestDescription ?? '输入原来的完整 Handle 和绑定手机号，我们会发送验证码来确认身份归属。' }), props.fixedHandle === undefined
                        ? _jsxs("label", { children: ["\u5B8C\u6574 Handle", _jsx("input", { ref: handle, value: handleDraft, onChange: event => { setHandleDraft(event.target.value); }, autoComplete: "username", placeholder: "\u4F8B\u5982 alice.awiki.info", autoFocus: true })] })
                        : (_jsxs("div", { className: css.recoveryIdentitySummary, children: [_jsx("span", { children: "\u5F53\u524D\u8EAB\u4EFD" }), _jsx("strong", { children: props.fixedHandle })] })), _jsxs("label", { children: ["\u7ED1\u5B9A\u624B\u673A\u53F7", _jsx("input", { ref: requestPhone, value: phoneDraft, onChange: event => { setPhoneDraft(event.target.value); }, type: "tel", autoComplete: "tel", autoFocus: props.fixedHandle !== undefined })] }), _jsx("button", { type: "submit", className: css.primary, disabled: props.pending || cooldown.seconds > 0 || phoneDraft.trim() === '', children: "\u83B7\u53D6\u6062\u590D\u9A8C\u8BC1\u7801" }), (error ?? props.requestError) && _jsx("small", { className: css.inlineError, role: "alert", children: error ?? props.requestError })] }) }));
    }
    if (props.progress === null || props.statusError) {
        return _jsx(AwikiIdentityPage, { ...props.onExit === undefined ? {} : { onBack: props.onExit }, backLabel: props.onExitLabel ?? '返回身份入口', children: _jsxs("div", { className: css.recoveryForm, children: [_jsx("h3", { children: "\u786E\u8BA4\u4E0A\u6B21\u6062\u590D\u7684\u8FDB\u5EA6" }), _jsx("p", { children: "\u8BF7\u5148\u786E\u8BA4\u6062\u590D\u72B6\u6001\uFF0C\u65E0\u9700\u91CD\u65B0\u53D1\u8D77\u6062\u590D\u3002" }), _jsx("p", { children: "\u6062\u590D\u8FDB\u5EA6\u5DF2\u4FDD\u7559\u3002\u8FD4\u56DE\u4E0D\u4F1A\u64A4\u9500\u5DF2\u63D0\u4EA4\u7684\u6062\u590D\u3002" }), (error ?? props.statusError) && _jsx("p", { role: "alert", children: error ?? props.statusError }), _jsx("button", { type: "button", className: css.primary, disabled: props.pending, onClick: () => { void refresh(); }, children: "\u91CD\u65B0\u68C0\u67E5\u6062\u590D\u7ED3\u679C" })] }) });
    }
    if (props.progress.phase === 'awaiting_factor' || (props.progress.allowedActions?.includes('prepare') && !props.progress.allowedActions?.includes('activate'))) {
        return (_jsx(AwikiIdentityPage, { ...props.onExit === undefined ? {} : { onBack: props.onExit }, backLabel: props.onExitLabel ?? '返回身份入口', children: _jsxs("form", { className: css.recoveryForm, onSubmit: (event) => { event.preventDefault(); void prepare(); }, children: [_jsx("div", { className: css.recoveryStatusLine, children: _jsx("span", { children: "\u6062\u590D\u8BF7\u6C42\u5DF2\u521B\u5EFA" }) }), _jsx("h3", { children: "\u9A8C\u8BC1\u8EAB\u4EFD\u5F52\u5C5E" }), _jsx("p", { children: "\u8BF7\u586B\u5199\u6536\u5230\u7684\u9A8C\u8BC1\u7801\u3002\u9A8C\u8BC1\u7801\u8FC7\u671F\u65F6\uFF0C\u53EF\u4EE5\u91CD\u65B0\u83B7\u53D6\u3002" }), _jsxs("div", { className: css.recoveryIdentitySummary, children: [_jsx("span", { children: "\u6062\u590D\u8EAB\u4EFD" }), _jsx("strong", { children: effectiveFactorContext?.fullHandle ?? props.progress?.fullHandle ?? '待确认' }), effectiveFactorContext !== null && _jsxs(_Fragment, { children: [_jsx("span", { children: "\u9A8C\u8BC1\u7801\u5DF2\u53D1\u9001\u81F3" }), _jsx("strong", { children: maskedPhone(effectiveFactorContext.phone) })] })] }), effectiveFactorContext === null && (_jsxs("label", { children: ["\u7ED1\u5B9A\u624B\u673A\u53F7", _jsx("input", { ref: factorPhone, value: phoneDraft, onChange: event => { setPhoneDraft(event.target.value); }, type: "tel", autoComplete: "tel", autoFocus: true })] })), _jsxs("label", { children: ["\u6062\u590D\u9A8C\u8BC1\u7801", _jsx("input", { ref: otp, value: otpDraft, onChange: event => { setOtpDraft(event.target.value); }, inputMode: "numeric", autoComplete: "one-time-code", autoFocus: effectiveFactorContext !== null })] }), _jsx("button", { type: "submit", className: css.primary, disabled: props.pending || !props.progress.allowedActions?.includes('prepare'), children: "\u9A8C\u8BC1\u6062\u590D\u4FE1\u606F" }), (effectiveFactorContext !== null || props.progress.fullHandle !== '') && (_jsx("button", { type: "button", className: css.secondary, disabled: props.pending || !props.progress.allowedActions?.includes('request_otp') || cooldown.seconds > 0 || (effectiveFactorContext === null && phoneDraft.trim() === ''), onClick: () => { void resendOtp(); }, children: cooldown.seconds > 0 ? `${cooldown.seconds} 秒后重新获取恢复验证码` : '重新获取恢复验证码' })), notice !== null && _jsx("small", { className: css.notice, role: "status", children: notice }), error !== null && _jsx("small", { className: css.inlineError, role: "alert", children: error }), props.progress.allowedActions?.includes('discard_pre_attempt') && _jsx("button", { type: "button", className: css.secondary, disabled: props.pending, onClick: () => { void discard(); }, children: "\u53D6\u6D88\u6062\u590D" }), _jsx(RecoveryDiagnostics, { operationId: props.operationId })] }) }));
    }
    const progress = props.progress;
    const preCommit = progress.phase === 'ready_to_commit' && progress.allowedActions?.includes('activate') === true && !commitAttempted;
    return (_jsx(AwikiIdentityPage, { ...props.onExit === undefined ? {} : { onBack: props.onExit }, backLabel: props.onExitLabel ?? '返回身份入口', live: preCommit ? 'off' : 'polite', children: _jsxs("div", { className: css.recoveryForm, children: [_jsx("div", { className: css.recoveryStatusLine, children: _jsx("span", { children: phaseLabel(progress.phase) }) }), _jsx("h3", { children: preCommit ? '确认恢复已有身份' : '身份恢复进度' }), _jsx("p", { className: css.recoveryHandle, children: progress.fullHandle }), _jsx("div", { className: css.recoveryImpact, children: _jsxs("p", { "data-tone": progress.localOrdinaryDataWillMigrate ? 'success' : 'neutral', children: [progress.localOrdinaryDataWillMigrate ? _jsx(IconCheckOutline16, { size: 14 }) : _jsx(IconWarningOutline16, { size: 14 }), "\u666E\u901A\u672C\u5730\u4F1A\u8BDD\u6570\u636E", progress.localOrdinaryDataWillMigrate ? '将迁移到恢复后的身份' : '不会迁移'] }) }), preCommit ? (_jsxs(_Fragment, { children: [_jsx("p", { className: css.recoveryConfirmationCopy, children: "\u786E\u8BA4\u540E\uFF0C\u8FD9\u53F0\u8BBE\u5907\u5C06\u4F7F\u7528\u65B0\u7684\u672C\u673A\u51ED\u8BC1\u3002\u8BF7\u52FF\u91CD\u590D\u63D0\u4EA4\uFF1B\u8FD4\u56DE\u5165\u53E3\u4E0D\u4F1A\u64A4\u9500\u5DF2\u63D0\u4EA4\u7684\u6062\u590D\u3002" }), _jsx("button", { type: "button", className: css.primary, disabled: props.pending, onClick: () => { void activate(); }, children: "\u786E\u8BA4\u5E76\u6062\u590D\u8EAB\u4EFD" })] })) : (_jsxs("div", { className: css.recoveryProgressPanel, "aria-live": "polite", children: [props.pending && _jsx(IconLoadingOutline16, { size: 18 }), _jsx("p", { children: progressMessage(progress) }), _jsx("p", { children: "\u6062\u590D\u8FDB\u5EA6\u5DF2\u4FDD\u7559\uFF0C\u53EF\u4EE5\u8FD4\u56DE\u5165\u53E3\u7A0D\u540E\u7EE7\u7EED\u3002" }), progress.phase === 'applied' && progress.allowedActions?.includes('activate_identity') && _jsx("button", { type: "button", className: css.primary, disabled: props.pending, onClick: () => { void props.enterRecoveredSession?.().then(result => { if (!result.ok)
                                setError(result.error); }); }, children: "\u8FDB\u5165 AWiki" }), progress.phase !== 'applied' && (_jsxs("button", { type: "button", className: css.primary, disabled: props.pending, onClick: () => { void (canResume(progress) ? resume() : refresh()); }, children: [_jsx(IconRefreshOutline16, { size: 14 }), canResume(progress) && (progress.phase === 'identity_transition_pending' || progress.phase === 'remote_committed')
                                    ? '继续完成本机切换'
                                    : '重新检查恢复结果'] }))] })), progress.allowedActions?.includes('discard_pre_attempt') && _jsx("button", { type: "button", className: css.secondary, disabled: props.pending, onClick: () => { void discard(); }, children: "\u53D6\u6D88\u6062\u590D" }), error !== null && _jsx("small", { className: css.inlineError, role: "alert", children: error }), _jsx(RecoveryDiagnostics, { operationId: progress.operationId, ...progress.failureCode === undefined ? {} : { failureCode: progress.failureCode } })] }) }));
}
//# sourceMappingURL=AwikiRecoveryForm.js.map