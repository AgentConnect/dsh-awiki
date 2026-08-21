import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { IconLoadingOutline16, IconRefreshOutline16, IconWarningOutline16, } from '@deepseek-ai/dsh-client-ui-primitives';
import css from './AwikiOverlay.module.css';
function accessCopy(status) {
    switch (status) {
        case 'loading':
            return { title: '正在确认群成员权限', detail: '本机已有消息会先保留显示。' };
        case 'recovering':
            return { title: '正在恢复此群聊的身份关联', detail: '完成后即可继续同步和发送消息。' };
        case 'blocked':
            return { title: '此群聊无法自动恢复', detail: '旧成员记录没有绑定 Handle。本机已有消息仍可查看，也可以尝试重新加入。' };
        case 'not-member':
            return { title: '当前身份暂时无法访问此群聊', detail: '服务器尚未确认当前身份是群成员。本机已有消息仍可查看。' };
        case 'network-error':
            return { title: '暂时无法确认群成员权限', detail: '请检查网络后重新确认。本机已有消息不受影响。' };
        case 'available':
            return { title: '群聊可用', detail: '' };
    }
}
/** Group-scoped access state with bounded recovery and navigation actions. */
export function AwikiGroupAccessNotice(props) {
    if (props.access.status === 'available')
        return null;
    const copy = accessCopy(props.access.status);
    const loading = props.access.status === 'loading';
    const canRejoin = props.access.status === 'blocked' || props.access.status === 'not-member';
    return (_jsxs("section", { className: css.groupAccessNotice, "data-status": props.access.status, "data-compact": props.compact || undefined, role: loading || props.access.status === 'recovering' ? 'status' : 'alert', "aria-live": "polite", children: [_jsx("span", { className: css.groupAccessIcon, children: loading || props.access.status === 'recovering'
                    ? _jsx(IconLoadingOutline16, { size: 16 })
                    : _jsx(IconWarningOutline16, { size: 16 }) }), _jsxs("span", { className: css.groupAccessCopy, children: [_jsx("strong", { children: copy.title }), _jsx("small", { children: copy.detail })] }), !loading && (_jsxs("span", { className: css.groupAccessActions, children: [_jsxs("button", { type: "button", disabled: props.pending, onClick: props.onRetry, children: [_jsx(IconRefreshOutline16, { size: 14 }), "\u91CD\u65B0\u68C0\u67E5"] }), canRejoin && _jsx("button", { type: "button", disabled: props.pending, onClick: props.onRejoin, children: "\u5C1D\u8BD5\u91CD\u65B0\u52A0\u5165" }), props.onBack !== undefined && _jsx("button", { type: "button", disabled: props.pending, onClick: props.onBack, children: "\u8FD4\u56DE\u4F1A\u8BDD\u5217\u8868" })] }))] }));
}
//# sourceMappingURL=AwikiGroupAccessNotice.js.map