import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
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
    return progress.retryable || ['remote_outcome_unknown', 'remote_committed', 'identity_transition_pending'].includes(progress.phase);
}
function maskedPhone(value) {
    const normalized = value.replace(/[\s()-]/g, '');
    if (normalized.length <= 7)
        return normalized;
    return `${normalized.slice(0, 3)}****${normalized.slice(-4)}`;
}
function progressMessage(progress) {
    switch (progress.phase) {
        case 'remote_outcome_unknown': return '恢复请求已经提交，正在确认服务端结果。请不要重新发起恢复。';
        case 'remote_committed': return '身份已在服务端恢复，正在为当前设备更新本机凭证。';
        case 'identity_transition_pending': return '身份已在服务端恢复，本机切换尚未完成。请继续完成本机切换。';
        case 'quarantined_key_unavailable': return '新的本机凭证暂时不可用，请稍后重新检查恢复结果。';
        case 'applied': return '身份已经恢复完成。';
        default: return '正在处理身份恢复，请保持窗口打开。';
    }
}
function RecoveryDiagnostics(props) {
    return (_jsxs("details", { className: css.recoveryDiagnostics, children: [_jsx("summary", { children: "\u8BCA\u65AD\u4FE1\u606F" }), _jsxs("dl", { children: [_jsxs("div", { children: [_jsx("dt", { children: "\u6062\u590D\u8BF7\u6C42\u7F16\u53F7" }), _jsx("dd", { children: _jsx("code", { children: props.operationId }) })] }), props.failureCode !== undefined && _jsxs("div", { children: [_jsx("dt", { children: "\u72B6\u6001\u4EE3\u7801" }), _jsx("dd", { children: _jsx("code", { children: props.failureCode }) })] })] })] }));
}
/** Status-first Handle recovery. Secret inputs remain inside the mounted form only. */
export function AwikiRecoveryForm(props) {
    const handle = useRef(null);
    const requestPhone = useRef(null);
    const factorPhone = useRef(null);
    const otp = useRef(null);
    const [commitAttempted, setCommitAttempted] = useState(false);
    const [factorContext, setFactorContext] = useState(null);
    const [notice, setNotice] = useState(null);
    const [error, setError] = useState(null);
    const effectiveFactorContext = factorContext ?? props.initialFactorContext ?? null;
    useEffect(() => {
        setCommitAttempted(false);
        setNotice(null);
        setError(null);
    }, [props.operationId]);
    useEffect(() => {
        const progress = props.progress;
        if (progress === null
            || progress.phase === 'awaiting_factor'
            || progress.phase === 'ready_to_commit'
            || progress.phase === 'applied'
            || progress.phase === 'quarantined_key_unavailable'
            || props.pending
            || error !== null)
            return;
        const timer = setTimeout(() => {
            void (canResume(progress) ? resume() : refresh());
        }, 900);
        return () => { clearTimeout(timer); };
    }, [error, props.pending, props.progress]);
    const requestOtp = async () => {
        setError(null);
        const fullHandle = props.fixedHandle?.trim() ?? handle.current?.value.trim() ?? '';
        const phone = requestPhone.current?.value.trim() ?? '';
        const result = await props.sendRecoveryOtp({
            fullHandle,
            phone,
        });
        if (!result.ok) {
            setError(result.error);
            return;
        }
        setFactorContext({ fullHandle: result.value.fullHandle, phone });
        setNotice('恢复验证码已发送。');
    };
    const prepare = async () => {
        setError(null);
        const result = await props.prepareRecovery({
            phone: effectiveFactorContext?.phone ?? factorPhone.current?.value.trim() ?? '',
            otp: otp.current?.value.trim() ?? '',
        });
        if (factorPhone.current !== null)
            factorPhone.current.value = '';
        if (otp.current !== null)
            otp.current.value = '';
        if (!result.ok) {
            setError(result.error);
            return;
        }
        setNotice(null);
    };
    const activate = async () => {
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
        if (result.value.phase === 'ready_to_commit')
            setCommitAttempted(false);
    };
    const resume = async () => {
        setError(null);
        const result = await props.resumeRecovery();
        if (!result.ok) {
            setError(result.error);
            return;
        }
        if (result.value.phase === 'ready_to_commit')
            setCommitAttempted(false);
    };
    const discard = async () => {
        setError(null);
        const result = await props.discardRecovery();
        if (!result.ok) {
            setError(result.error);
            return;
        }
        props.onExit?.();
    };
    if (props.operationId === null) {
        return (_jsx(AwikiIdentityPage, { ...props.onExit === undefined ? {} : { onBack: props.onExit }, backLabel: props.onExitLabel ?? '返回本机身份', backDisabled: props.pending, children: _jsxs("form", { className: css.recoveryForm, onSubmit: (event) => { event.preventDefault(); void requestOtp(); }, children: [_jsx("div", { className: css.registrationIcon, children: _jsx(IconUserOutline16, { size: 24 }) }), _jsx("h3", { children: props.requestTitle ?? '恢复已有身份' }), _jsx("p", { children: props.requestDescription ?? '输入原来的完整 Handle 和绑定手机号，我们会发送验证码来确认身份归属。' }), props.fixedHandle === undefined
                        ? _jsxs("label", { children: ["\u5B8C\u6574 Handle", _jsx("input", { ref: handle, autoComplete: "username", placeholder: "\u4F8B\u5982 alice.awiki.info", autoFocus: true })] })
                        : (_jsxs("div", { className: css.recoveryIdentitySummary, children: [_jsx("span", { children: "\u5F53\u524D\u8EAB\u4EFD" }), _jsx("strong", { children: props.fixedHandle })] })), _jsxs("label", { children: ["\u7ED1\u5B9A\u624B\u673A\u53F7", _jsx("input", { ref: requestPhone, type: "tel", autoComplete: "tel", autoFocus: props.fixedHandle !== undefined })] }), _jsx("button", { type: "submit", className: css.primary, disabled: props.pending, children: "\u83B7\u53D6\u6062\u590D\u9A8C\u8BC1\u7801" }), error !== null && _jsx("small", { className: css.inlineError, role: "alert", children: error })] }) }));
    }
    if (props.progress === null || props.progress.phase === 'awaiting_factor') {
        return (_jsx(AwikiIdentityPage, { onBack: () => { void discard(); }, backLabel: "\u53D6\u6D88\u6062\u590D", backDisabled: props.pending || commitAttempted, children: _jsxs("form", { className: css.recoveryForm, onSubmit: (event) => { event.preventDefault(); void prepare(); }, children: [_jsx("div", { className: css.recoveryStatusLine, children: _jsx("span", { children: "\u6062\u590D\u8BF7\u6C42\u5DF2\u521B\u5EFA" }) }), _jsx("h3", { children: "\u9A8C\u8BC1\u8EAB\u4EFD\u5F52\u5C5E" }), _jsx("p", { children: "\u9A8C\u8BC1\u7801\u5DF2\u53D1\u9001\uFF0C\u8BF7\u5B8C\u6210\u9A8C\u8BC1\u540E\u518D\u786E\u8BA4\u662F\u5426\u6062\u590D\u3002" }), _jsxs("div", { className: css.recoveryIdentitySummary, children: [_jsx("span", { children: "\u6062\u590D\u8EAB\u4EFD" }), _jsx("strong", { children: effectiveFactorContext?.fullHandle ?? props.progress?.fullHandle ?? '待确认' }), effectiveFactorContext !== null && _jsxs(_Fragment, { children: [_jsx("span", { children: "\u9A8C\u8BC1\u7801\u5DF2\u53D1\u9001\u81F3" }), _jsx("strong", { children: maskedPhone(effectiveFactorContext.phone) })] })] }), effectiveFactorContext === null && (_jsxs("label", { children: ["\u7ED1\u5B9A\u624B\u673A\u53F7", _jsx("input", { ref: factorPhone, type: "tel", autoComplete: "tel", autoFocus: true })] })), _jsxs("label", { children: ["\u6062\u590D\u9A8C\u8BC1\u7801", _jsx("input", { ref: otp, inputMode: "numeric", autoComplete: "one-time-code", autoFocus: effectiveFactorContext !== null })] }), _jsx("button", { type: "submit", className: css.primary, disabled: props.pending, children: "\u9A8C\u8BC1\u6062\u590D\u4FE1\u606F" }), notice !== null && _jsx("small", { className: css.notice, role: "status", children: notice }), error !== null && _jsx("small", { className: css.inlineError, role: "alert", children: error }), _jsx(RecoveryDiagnostics, { operationId: props.operationId })] }) }));
    }
    const progress = props.progress;
    const preCommit = progress.phase === 'ready_to_commit' && !commitAttempted;
    return (_jsx(AwikiIdentityPage, { ...preCommit ? { onBack: () => { void discard(); }, backLabel: '取消恢复', backDisabled: props.pending } : {}, live: preCommit ? 'off' : 'polite', children: _jsxs("div", { className: css.recoveryForm, children: [_jsx("div", { className: css.recoveryStatusLine, children: _jsx("span", { children: phaseLabel(progress.phase) }) }), _jsx("h3", { children: preCommit ? '确认恢复已有身份' : '身份恢复进度' }), _jsx("p", { className: css.recoveryHandle, children: progress.fullHandle }), _jsxs("div", { className: css.recoveryImpact, children: [_jsxs("p", { "data-tone": progress.localOrdinaryDataWillMigrate ? 'success' : 'neutral', children: [progress.localOrdinaryDataWillMigrate ? _jsx(IconCheckOutline16, { size: 14 }) : _jsx(IconWarningOutline16, { size: 14 }), "\u666E\u901A\u672C\u5730\u4F1A\u8BDD\u6570\u636E", progress.localOrdinaryDataWillMigrate ? '将迁移到恢复后的身份' : '不会迁移'] }), progress.unsupportedE2eeGroupCount > 0 && _jsxs("p", { "data-tone": "neutral", children: [_jsx(IconWarningOutline16, { size: 14 }), "\u6709 ", progress.unsupportedE2eeGroupCount, " \u4E2A\u52A0\u5BC6\u7FA4\u804A\u65E0\u6CD5\u81EA\u52A8\u8FC1\u79FB\u3002"] }), progress.unsupportedDidOnlyGroupCount > 0 && _jsxs("p", { "data-tone": "neutral", children: [_jsx(IconWarningOutline16, { size: 14 }), "\u6709 ", progress.unsupportedDidOnlyGroupCount, " \u4E2A\u4EC5 DID \u7FA4\u804A\u9700\u8981\u624B\u52A8\u5904\u7406\u3002"] })] }), preCommit ? (_jsxs(_Fragment, { children: [_jsx("p", { className: css.recoveryConfirmationCopy, children: "\u786E\u8BA4\u540E\uFF0C\u8FD9\u53F0\u8BBE\u5907\u5C06\u4F7F\u7528\u65B0\u7684\u672C\u673A\u51ED\u8BC1\u3002\u6062\u590D\u5F00\u59CB\u540E\u8BF7\u4FDD\u6301\u7A97\u53E3\u6253\u5F00\uFF0C\u4E0D\u8981\u91CD\u590D\u63D0\u4EA4\u3002" }), _jsx("button", { type: "button", className: css.primary, disabled: props.pending, onClick: () => { void activate(); }, children: "\u786E\u8BA4\u5E76\u6062\u590D\u8EAB\u4EFD" })] })) : (_jsxs("div", { className: css.recoveryProgressPanel, "aria-live": "polite", children: [error === null && progress.phase !== 'quarantined_key_unavailable' && _jsx(IconLoadingOutline16, { size: 18 }), _jsx("p", { children: progressMessage(progress) }), (error !== null || progress.phase === 'quarantined_key_unavailable') && (_jsxs("button", { type: "button", className: css.primary, disabled: props.pending, onClick: () => { void (canResume(progress) ? resume() : refresh()); }, children: [_jsx(IconRefreshOutline16, { size: 14 }), progress.phase === 'identity_transition_pending' || progress.phase === 'remote_committed'
                                    ? '继续完成本机切换'
                                    : '重新检查恢复结果'] }))] })), error !== null && _jsx("small", { className: css.inlineError, role: "alert", children: error }), _jsx(RecoveryDiagnostics, { operationId: progress.operationId, ...progress.failureCode === undefined ? {} : { failureCode: progress.failureCode } })] }) }));
}
//# sourceMappingURL=AwikiRecoveryForm.js.map