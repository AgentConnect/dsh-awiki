/** AWiki identity and installation settings contributed to DSH settings. */
import { type ReactNode } from 'react';
import type { SettingsScope, SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-runtime/client';
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { AwikiSettings } from '../settings.ts';
/** Browser actions and reactive Host-owned AWiki settings state. */
export interface AwikiSettingsInjected {
    hooks: {
        /** Host-backed AWiki settings namespace. */
        awikiSettings: SettingsScope<AwikiSettings>;
    };
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
/** Render only the settings owned by the main AWiki identity and messaging plugin. */
export declare function AwikiSettingsSection(props: AwikiSettingsSectionProps): ReactNode;
export { hasDomainOverride };
//# sourceMappingURL=AwikiSettingsSection.d.ts.map