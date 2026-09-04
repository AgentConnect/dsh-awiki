import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/** Proactive ready-admin reminder for newly pending device join requests. */
import { useEffect, useRef, useState } from 'react';
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives';
import { AwikiDevices, TERMINAL_DEVICE_JOIN_STATES } from "./AwikiDevices.js";
import css from './AwikiDeviceJoinReminder.module.css';
/**
 * Poll for join requests while an admin identity is active, without exposing
 * pending device management to member devices or repeatedly prompting for the
 * same request during one identity session.
 */
export function AwikiDeviceJoinReminder(props) {
    const [request, setRequest] = useState(null);
    const [managing, setManaging] = useState(false);
    const dismissedRequestRefs = useRef(new Set());
    useEffect(() => {
        dismissedRequestRefs.current.clear();
        setRequest(null);
        setManaging(false);
    }, [props.identityKey]);
    useEffect(() => {
        if (!props.active || props.identityKey === null || managing)
            return;
        let alive = true;
        let inFlight = false;
        let timer;
        const poll = async () => {
            if (inFlight)
                return;
            inFlight = true;
            try {
                const result = await props.refreshDeviceManagement();
                if (!alive || !result.ok)
                    return;
                if (!result.value.canManage) {
                    setRequest(null);
                    if (timer !== undefined)
                        clearInterval(timer);
                    return;
                }
                const actionable = result.value.requests.filter(value => !TERMINAL_DEVICE_JOIN_STATES.has(value.state));
                const liveRequestRefs = new Set(actionable.map(value => value.requestRef));
                setRequest(current => {
                    if (current !== null && liveRequestRefs.has(current.requestRef))
                        return current;
                    return actionable.find(value => !dismissedRequestRefs.current.has(value.requestRef)) ?? null;
                });
            }
            finally {
                inFlight = false;
            }
        };
        void poll();
        timer = setInterval(() => { void poll(); }, props.pollIntervalMs ?? 3_000);
        return () => {
            alive = false;
            if (timer !== undefined)
                clearInterval(timer);
        };
    }, [managing, props.active, props.identityKey, props.pollIntervalMs, props.refreshDeviceManagement]);
    const dismiss = () => {
        if (request !== null)
            dismissedRequestRefs.current.add(request.requestRef);
        setRequest(null);
    };
    const manage = () => {
        if (request !== null)
            dismissedRequestRefs.current.add(request.requestRef);
        setRequest(null);
        setManaging(true);
    };
    return (_jsxs(_Fragment, { children: [_jsx(Modal, { open: request !== null, onClose: dismiss, title: "\u6709\u65B0\u8BBE\u5907\u8BF7\u6C42\u52A0\u5165", closeLabel: "\u7A0D\u540E\u5904\u7406", description: "\u68C0\u6D4B\u5230\u4E00\u53F0\u65B0\u8BBE\u5907\u6B63\u5728\u8BF7\u6C42\u52A0\u5165\u5F53\u524D AWiki \u8EAB\u4EFD\u3002\u6279\u51C6\u524D\u8BF7\u6838\u5BF9\u4E24\u53F0\u8BBE\u5907\u663E\u793A\u7684\u5B89\u5168\u7801\u3002", footer: (_jsxs(_Fragment, { children: [_jsx(Button, { type: "button", variant: "outline", onClick: dismiss, children: "\u7A0D\u540E\u5904\u7406" }), _jsx(Button, { type: "button", onClick: manage, children: "\u7ACB\u5373\u5904\u7406" })] })), children: request !== null && (_jsxs("div", { className: css.request, children: [_jsx("span", { children: "\u8BBE\u5907\u5BC6\u94A5\u6307\u7EB9" }), _jsx("code", { children: request.candidateKeyFingerprint }), _jsxs("small", { children: ["\u8BF7\u6C42\u6709\u6548\u671F\u81F3 ", request.expiresAt] })] })) }), _jsx(Modal, { open: managing, onClose: () => { setManaging(false); }, title: "\u8BBE\u5907\u7BA1\u7406", closeLabel: "\u5173\u95ED\u8BBE\u5907\u7BA1\u7406", className: css.managementModal ?? '', contentClassName: css.managementContent ?? '', footer: _jsx(Button, { type: "button", variant: "outline", onClick: () => { setManaging(false); }, children: "\u5B8C\u6210" }), children: _jsx(AwikiDevices, { active: managing, pending: props.pending, refreshDeviceManagement: props.refreshDeviceManagement, startDeviceJoinVerification: props.startDeviceJoinVerification, approveDeviceJoin: props.approveDeviceJoin, rejectDeviceJoin: props.rejectDeviceJoin, revokeDevice: props.revokeDevice, prepareRootTransfer: props.prepareRootTransfer, confirmRootTransfer: props.confirmRootTransfer }) })] }));
}
//# sourceMappingURL=AwikiDeviceJoinReminder.js.map