/** AWiki settings page contributed to the DSH settings navigation. */
import { type ReactNode } from 'react';
import type { SettingsScope, SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-runtime/client';
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { AwikiSettings } from '../settings.ts';
/** Browser actions and reactive Host settings state. */
export interface AwikiSettingsInjected {
    hooks: {
        /** Host-backed AWiki settings namespace. */
        awikiSettings: SettingsScope<AwikiSettings>;
    };
    /** Persist a normalized domain. */
    saveDomain: (domain: string) => Promise<void>;
    /** Remove the user override and restore the composition default. */
    resetDomain: () => Promise<void>;
}
/** Full composed settings-section props. */
export type AwikiSettingsSectionProps = PropsRuntime<'settings.section'> & PropsLocale<'settings.awiki'> & InjectFace<AwikiSettingsInjected>;
declare function hasDomainOverride(snapshot: SettingsScopeSnapshot<AwikiSettings>): boolean;
/** Render a durable default-domain editor in the native DSH settings shell. */
export declare function AwikiSettingsSection(props: AwikiSettingsSectionProps): ReactNode;
export { hasDomainOverride };
//# sourceMappingURL=AwikiSettingsSection.d.ts.map