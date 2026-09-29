import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Modal } from '@deepseek-ai/dsh-client-ui-primitives';
import { AwikiAvatar, useAvatarReference } from "./AwikiAvatar.js";
import { avatarCache, safeAvatarUrl } from "./avatar-cache.js";
import { useAvatarDialogEscape } from "./avatar-dialog.js";
import css from './AwikiAvatar.module.css';
export function AwikiAvatarPreview(props) {
    const [open, setOpen] = useState(false);
    useAvatarDialogEscape(open, () => { setOpen(false); });
    const { context, main } = useAvatarReference(props);
    const uri = safeAvatarUrl(main);
    useEffect(() => { context?.demand(props.did); }, [context?.demand, props.did]);
    useEffect(() => { setOpen(false); }, [context?.owner, props.did]);
    return _jsxs(_Fragment, { children: [uri === undefined ? _jsx(AwikiAvatar, { ...props }) : _jsx("button", { type: "button", className: css.avatarAction, "aria-label": `查看${props.name}的头像`, title: "\u67E5\u770B\u5934\u50CF", onClick: () => { context?.demand(props.did, true); setOpen(true); }, children: _jsx(AwikiAvatar, { ...props }) }), open && _jsx(Modal, { open: true, title: "\u5934\u50CF", closeLabel: "\u5173\u95ED\u5934\u50CF", onClose: () => { setOpen(false); }, children: _jsx(AvatarLargeImage, { owner: context?.owner ?? '', uri: uri }) })] });
}
function AvatarLargeImage(props) {
    const [retry, setRetry] = useState(0);
    const [state, setState] = useState();
    useEffect(() => {
        const { uri, owner } = props;
        if (uri === undefined || owner === '')
            return;
        let active = true;
        setState({ owner, uri, loading: true });
        void avatarCache.load(owner, uri, 512, retry > 0).then(image => {
            if (active)
                setState({ owner, uri, image, loading: false });
        }).catch(() => { if (active)
            setState({ owner, uri, loading: false }); });
        return () => { active = false; };
    }, [props.owner, props.uri, retry]);
    const current = state?.owner === props.owner && state?.uri === props.uri ? state : undefined;
    return _jsx("div", { className: css.previewBody, children: props.uri === undefined ? _jsx("p", { children: "\u5C1A\u672A\u8BBE\u7F6E\u5934\u50CF" }) : current === undefined || current.loading ? _jsx("p", { role: "status", children: "\u6B63\u5728\u52A0\u8F7D\u5934\u50CF\u2026" })
            : current.image !== undefined ? _jsx("img", { className: css.previewImage, src: current.image, alt: "\u5934\u50CF\u5927\u56FE", draggable: false, onError: () => { setState({ owner: props.owner, uri: props.uri, loading: false }); } })
                : _jsxs(_Fragment, { children: [_jsx("p", { role: "alert", children: "\u5934\u50CF\u52A0\u8F7D\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5\u3002" }), _jsx("button", { type: "button", onClick: () => { setRetry(value => value + 1); }, children: "\u91CD\u8BD5" })] }) });
}
//# sourceMappingURL=AwikiAvatarPreview.js.map