/** AWiki account, usage, and advanced settings contributed to DSH settings. */
import { type ReactNode } from 'react';
import type { SettingsScope, SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-runtime/client';
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { AwikiSettings } from '../settings.ts';
import type { AwikiModelProxyController } from './model-proxy-controller.ts';
/** Browser actions and reactive Host-owned state. */
export interface AwikiSettingsInjected {
    hooks: {
        /** Host-backed AWiki settings namespace. */
        awikiSettings: SettingsScope<AwikiSettings>;
        /** Sanitized loopback model account state. */
        awikiModelProxy: AwikiModelProxyController;
    };
    /** Host-only model account actions; credentials never enter this face. */
    models: AwikiModelProxyController;
    /** Persist a normalized domain. */
    saveDomain: (domain: string) => Promise<void>;
    /** Remove the user override and restore the composition default. */
    resetDomain: () => Promise<void>;
    /** Permanently remove the Host installation's local AWiki state. */
    clearLocalData: () => Promise<void>;
}
/** Full composed settings-section props. */
export type AwikiSettingsSectionProps = PropsRuntime<'settings.section'> & PropsLocale<'settings.awiki'> & InjectFace<AwikiSettingsInjected>;
declare function hasDomainOverride(snapshot: SettingsScopeSnapshot<AwikiSettings>): boolean;
/** Render account controls, usage visibility, and existing advanced settings. */
export declare function AwikiSettingsSection(props: AwikiSettingsSectionProps): ReactNode;
declare function parseAmountCents(value: string): number | undefined;
declare function openPaymentUrl(value: string): boolean;
export { hasDomainOverride, openPaymentUrl, parseAmountCents };
//# sourceMappingURL=AwikiSettingsSection.d.ts.map