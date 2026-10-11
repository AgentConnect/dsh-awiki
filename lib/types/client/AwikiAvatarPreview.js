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
    const { context, main, thumbnail, subjectType } = useAvatarReference(props);
    const uri = safeAvatarUrl(main);
    useEffect(() => { context?.demand(props.did); }, [context?.demand, props.did]);
    useEffect(() => { setOpen(false); }, [context?.owner, props.did]);
    return _jsxs(_Fragment, { children: [uri === undefined ? _jsx(AwikiAvatar, { ...props }) : _jsx("button", { type: "button", className: css.avatarAction, "aria-label": `查看${props.name}的头像`, title: "\u67E5\u770B\u5934\u50CF", onClick: () => { context?.demand(props.did, true); setOpen(true); }, children: _jsx(AwikiAvatar, { ...props }) }), open && _jsx(Modal, { open: true, title: "\u5934\u50CF", closeLabel: "\u5173\u95ED\u5934\u50CF", onClose: () => { setOpen(false); }, children: _jsx(AvatarLargeImage, { owner: context?.owner ?? '', uri: uri, poster: safeAvatarUrl(thumbnail), animate: subjectType === 'agent', name: props.name }) })] });
}
function AvatarLargeImage(props) {
    const [retry, setRetry] = useState(0);
    const [motion, setMotion] = useState(false);
    const [failed, setFailed] = useState(false);
    const [state, setState] = useState();
    useEffect(() => {
        const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
        const update = () => { setMotion(!media?.matches && document.visibilityState !== 'hidden'); };
        update();
        media?.addEventListener('change', update);
        document.addEventListener('visibilitychange', update);
        return () => { media?.removeEventListener('change', update); document.removeEventListener('visibilitychange', update); };
    }, []);
    const animate = props.animate && motion && !failed;
    const uri = animate ? props.uri : props.poster ?? props.uri;
    useEffect(() => {
        const { owner } = props;
        if (uri === undefined || owner === '')
            return;
        let active = true;
        let loading = false;
        let timer;
        const load = async (force = false) => {
            if (!active || loading)
                return;
            clearTimeout(timer);
            loading = true;
            const image = await avatarCache.load(owner, uri, 512, force, animate).catch(() => undefined);
            loading = false;
            if (!active)
                return;
            if (image === undefined && animate && props.poster !== undefined) {
                setFailed(true);
                return;
            }
            setState(previous => ({ owner, uri, animate, image: image ?? (previous?.owner === owner && previous.uri === uri && previous.animate === animate ? previous.image : undefined), loading: false }));
            timer = setTimeout(() => { void load(); }, 300_000);
        };
        const online = () => { clearTimeout(timer); void load(true); };
        window.addEventListener('online', online);
        void load(true);
        return () => { active = false; clearTimeout(timer); window.removeEventListener('online', online); };
    }, [props.owner, uri, retry, animate, props.poster]);
    const current = state?.owner === props.owner && state?.uri === uri && state.animate === animate ? state : undefined;
    return _jsx("div", { className: css.previewBody, children: props.uri === undefined ? _jsx("p", { children: "\u5C1A\u672A\u8BBE\u7F6E\u5934\u50CF" }) : current?.image !== undefined ? _jsx("img", { className: css.previewImage, src: current.image, alt: "\u5934\u50CF\u5927\u56FE", draggable: false, onError: () => {
                if (animate && props.poster !== undefined)
                    setFailed(true);
                else
                    setState({ owner: props.owner, uri: uri, animate, loading: false });
            } }) : _jsxs(_Fragment, { children: [_jsx("span", { role: "img", "aria-label": props.name, children: Array.from(props.name).slice(0, 2).join('') }), _jsx("p", { role: current === undefined ? "status" : "alert", children: current === undefined ? '正在加载头像…' : '头像加载失败，请重试。' }), _jsx("button", { type: "button", onClick: () => { setFailed(false); setRetry(value => value + 1); }, children: "\u91CD\u8BD5" })] }) });
}
//# sourceMappingURL=AwikiAvatarPreview.js.map