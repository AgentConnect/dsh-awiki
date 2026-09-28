import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { avatarCache, safeAvatarUrl } from "./avatar-cache.js";
import css from './AwikiAvatar.module.css';
const Context = createContext(undefined);
export function AwikiAvatarProvider(props) {
    const profiles = useRef(new Map());
    const groups = useRef(new Map());
    const checked = useRef(new Map());
    const peers = useRef(new Set());
    const scheduled = useRef(false);
    const groupQueue = useRef([]);
    const groupRunning = useRef(0);
    const generation = useRef(0);
    const listeners = useRef(new Map());
    const subscribe = useCallback((key, listener) => {
        const values = listeners.current.get(key) ?? new Set();
        values.add(listener);
        listeners.current.set(key, values);
        return () => { values.delete(listener); if (values.size === 0)
            listeners.current.delete(key); };
    }, []);
    const emit = useCallback((key) => { listeners.current.get(key)?.forEach(listener => { listener(); }); }, []);
    useLayoutEffect(() => {
        generation.current++;
        scheduled.current = false;
        profiles.current.clear();
        groups.current.clear();
        checked.current.clear();
        peers.current.clear();
        groupQueue.current.length = 0;
        avatarCache.reset();
        for (const values of listeners.current.values())
            values.forEach(listener => { listener(); });
        return () => { generation.current++; avatarCache.reset(); };
    }, [props.owner]);
    const demand = useCallback((did) => {
        if (props.owner === '' || did === props.profile?.did || (checked.current.get(did) ?? 0) > Date.now() - 300_000)
            return;
        peers.current.add(did);
        if (scheduled.current)
            return;
        scheduled.current = true;
        const operation = generation.current;
        const flush = () => {
            if (operation !== generation.current)
                return;
            const batch = [...peers.current].slice(0, 100);
            batch.forEach(peer => { peers.current.delete(peer); checked.current.set(peer, Date.now()); });
            while (checked.current.size > 8192)
                checked.current.delete(checked.current.keys().next().value);
            if (batch.length === 0) {
                scheduled.current = false;
                return;
            }
            void props.avatarDisplayProfiles(batch).then(values => {
                if (operation !== generation.current)
                    return;
                const received = new Set();
                for (const value of values)
                    if (value.cacheHit) {
                        profiles.current.set(value.did, value);
                        received.add(value.did);
                        emit(`peer:${value.did}`);
                    }
                for (const peer of batch)
                    if (!received.has(peer))
                        checked.current.set(peer, Date.now() - 270_000);
                while (profiles.current.size > 2048) {
                    const key = profiles.current.keys().next().value;
                    profiles.current.delete(key);
                    emit(`peer:${key}`);
                }
            }).catch(() => { if (operation === generation.current)
                for (const peer of batch)
                    checked.current.set(peer, Date.now() - 270_000); })
                .finally(() => { if (operation === generation.current)
                queueMicrotask(flush); });
        };
        queueMicrotask(flush);
    }, [props.owner, props.profile?.did, props.avatarDisplayProfiles, emit]);
    const demandGroup = useCallback((did) => {
        const key = `group:${did}`;
        if (props.owner === '' || (checked.current.get(key) ?? 0) > Date.now() - 300_000)
            return;
        checked.current.set(key, Date.now());
        while (checked.current.size > 8192)
            checked.current.delete(checked.current.keys().next().value);
        groupQueue.current.push({ did, operation: generation.current });
        const pump = () => {
            while (groupRunning.current < 4 && groupQueue.current.length > 0) {
                const job = groupQueue.current.shift();
                if (job.operation !== generation.current)
                    continue;
                groupRunning.current++;
                void props.avatarGroup(job.did).then(value => {
                    if (job.operation !== generation.current)
                        return;
                    if (value === null) {
                        checked.current.set(`group:${job.did}`, Date.now() - 270_000);
                        return;
                    }
                    const old = groups.current.get(job.did)?.groupStateVersion;
                    const next = value.groupStateVersion;
                    if (old !== undefined && next !== undefined && /^(0|[1-9][0-9]*)$/u.test(old) && /^(0|[1-9][0-9]*)$/u.test(next) && BigInt(next) < BigInt(old))
                        return;
                    groups.current.set(job.did, value);
                    emit(`group:${job.did}`);
                    while (groups.current.size > 2048) {
                        const key = groups.current.keys().next().value;
                        groups.current.delete(key);
                        emit(`group:${key}`);
                    }
                }).catch(() => { if (job.operation === generation.current)
                    checked.current.set(`group:${job.did}`, Date.now() - 270_000); })
                    .finally(() => { groupRunning.current--; pump(); });
            }
        };
        pump();
    }, [props.owner, props.avatarGroup, emit]);
    const context = useMemo(() => ({ owner: props.owner, self: props.profile, profiles: profiles.current, groups: groups.current, demand, demandGroup, subscribe }), [props.owner, props.profile, demand, demandGroup, subscribe]);
    return _jsx(Context.Provider, { value: context, children: props.children });
}
export function AwikiAvatar(props) {
    const context = useContext(Context);
    const element = useRef(null);
    const [visible, setVisible] = useState(typeof IntersectionObserver === 'undefined');
    const [loaded, setLoaded] = useState();
    const size = props.size ?? 36;
    const peer = useSyncExternalStore(useCallback(listener => context?.subscribe(`peer:${props.did}`, listener) ?? (() => { }), [context?.subscribe, props.did]), () => props.did === undefined ? undefined : context?.profiles.get(props.did), () => undefined);
    const group = useSyncExternalStore(useCallback(listener => context?.subscribe(`group:${props.groupDid}`, listener) ?? (() => { }), [context?.subscribe, props.groupDid]), () => props.groupDid === undefined ? undefined : context?.groups.get(props.groupDid), () => undefined);
    const profile = props.did === context?.self?.did ? context?.self : peer;
    const main = profile !== undefined && profile !== null ? profile.avatarUri : group !== undefined ? group.avatarUri : props.uri;
    const thumbnail = profile !== undefined && profile !== null ? profile.avatarThumbnailUri : props.thumbnail;
    const uri = main === null ? undefined : safeAvatarUrl(size <= 64 ? thumbnail ?? main : main);
    useEffect(() => {
        if (typeof IntersectionObserver === 'undefined' || element.current === null)
            return;
        const observer = new IntersectionObserver(entries => { setVisible(entries.some(entry => entry.isIntersecting)); }, { rootMargin: '96px' });
        observer.observe(element.current);
        return () => observer.disconnect();
    }, []);
    useEffect(() => {
        if (!visible)
            return;
        const refresh = () => {
            if (document.visibilityState === 'hidden')
                return;
            if (props.did !== undefined)
                context?.demand(props.did);
            if (props.groupDid !== undefined)
                context?.demandGroup(props.groupDid);
        };
        refresh();
        const timer = setInterval(refresh, 30_000);
        document.addEventListener('visibilitychange', refresh);
        return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
    }, [visible, props.did, props.groupDid, context?.demand, context?.demandGroup]);
    useEffect(() => {
        setLoaded(undefined);
        if (!visible || uri === undefined || context?.owner === undefined || context.owner === '')
            return;
        let active = true;
        let timer;
        const load = async () => {
            if (!active)
                return;
            if (document.visibilityState === 'hidden') {
                timer = setTimeout(() => { void load(); }, 30_000);
                return;
            }
            const value = await avatarCache.load(context.owner, uri, size <= 64 ? 128 : 512);
            if (!active)
                return;
            if (value !== undefined)
                setLoaded({ owner: context.owner, uri, image: value });
            timer = setTimeout(() => { void load(); }, value === undefined ? 30_000 : 300_000);
        };
        void load();
        return () => { active = false; clearTimeout(timer); };
    }, [context?.owner, uri, visible, size]);
    const image = loaded?.owner === context?.owner && loaded?.uri === uri ? loaded?.image : undefined;
    const members = uri === undefined ? group?.avatarMembers : undefined;
    const label = Array.from(props.name.trim()).slice(0, 2).join('') || (props.groupDid === undefined ? '人' : '群');
    return _jsx("span", { ref: element, className: css.avatar, style: { width: size, height: size, fontSize: size / 3 }, "aria-label": props.name, children: members !== undefined && members.length > 0 && members.length <= 4 ? _jsx("span", { className: css.mosaic, "data-count": members.length, children: members.map(member => _jsx(AwikiAvatar, { name: member.memberHandle ?? member.memberDid, did: member.memberDid, size: members.length === 1 ? size : (size - 6) / 2 }, member.memberKey)) }) : image === undefined ? label : _jsx("img", { src: image, alt: "", width: size, height: size, draggable: false, onError: () => { setLoaded(undefined); } }) });
}
//# sourceMappingURL=AwikiAvatar.js.map