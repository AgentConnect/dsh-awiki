import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { IconChevronLeftOutline14 } from '@deepseek-ai/dsh-client-ui-primitives';
import css from './AwikiIdentityPage.module.css';
/** Shared navigation and overflow boundary for every identity access step. */
export function AwikiIdentityPage(props) {
    return (_jsxs("section", { className: css.page, "aria-live": props.live, children: [props.onBack !== undefined && (_jsx("nav", { className: css.navigation, "aria-label": "\u8EAB\u4EFD\u6D41\u7A0B\u5BFC\u822A", children: _jsxs("button", { type: "button", className: css.backButton, disabled: props.backDisabled, onClick: props.onBack, children: [_jsx(IconChevronLeftOutline14, { size: 14 }), _jsx("span", { children: props.backLabel ?? '返回' })] }) })), _jsx("div", { className: css.viewport, children: _jsx("div", { className: css.content, children: props.children }) })] }));
}
//# sourceMappingURL=AwikiIdentityPage.js.map