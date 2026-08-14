/** AWiki browser plugin: one floating `shell.overlay` entry backed by Host Remote. */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
export type * from '../types.ts';
export type { AwikiActionResult, AwikiControllerStatus, AwikiRemote, AwikiView } from './controller.ts';
export type { AwikiInjected, AwikiOverlayProps } from './slots.ts';
export type { AwikiSettingsInjected, AwikiSettingsSectionProps } from './AwikiSettingsSection.tsx';
export { createAwikiOverlayStore } from './store.ts';
/** Required services: Remote, settings transport, locale, and slot registry. */
export declare const inject: string[];
/**
 * Mount the optional AWiki Remote and register the frame-wide floating launcher and anchored chat panel.
 * @param ctx - browser context carrying slots and Remote.
 * @returns disposer for the slot injection and AWiki Remote contribution.
 */
export declare function apply(ctx: ClientContext): Promise<() => Promise<void>>;
//# sourceMappingURL=index.d.ts.map