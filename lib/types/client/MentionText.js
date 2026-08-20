import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { mentionSegments } from "./mentions.js";
import css from './AwikiOverlay.module.css';
/** Render protocol-validated mention ranges without interpreting raw @text. */
export function MentionText(props) {
    return _jsx(_Fragment, { children: mentionSegments(props.text, props.mentions).map((segment, index) => segment.mention
            ? _jsx("mark", { className: css.mention, children: segment.text }, segment.id ?? index)
            : _jsx("span", { children: segment.text }, index)) });
}
//# sourceMappingURL=MentionText.js.map