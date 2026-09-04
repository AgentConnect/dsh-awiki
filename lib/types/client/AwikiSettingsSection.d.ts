/** AWiki identity and installation settings contributed to DSH settings. */
import { type ReactNode } from 'react';
import type { SettingsScope, SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-runtime/client';
import type { HostObservable, InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { AwikiSettings } from '../settings.ts';
import type { AwikiGroupSnapshot, AwikiIntegrationFields, AwikiIntegrationView } from '../types.ts';
import type { AwikiActionResult, AwikiView } from './controller.ts';
import { type AwikiDevicesProps } from './AwikiDevices.tsx';
/** Browser actions and reactive Host-owned AWiki settings state. */
export interface AwikiSettingsInjected extends Omit<AwikiDevicesProps, 'active' | 'pending'> {
    hooks: {
        /** Host-backed AWiki settings namespace. */
        awikiSettings: SettingsScope<AwikiSettings>;
        /** Shared identity state determines whether device management is available. */
        awiki: HostObservable<AwikiView>;
    };
    /** Persist a normalized domain. */
    saveDomain: (domain: string) => Promise<void>;
    /** Remove the user override and restore the composition default. */
    resetDomain: () => Promise<void>;
    /** Permanently remove the Host installation's local AWiki state. */
    clearLocalData: () => Promise<void>;
    /** Load the shared identity state when settings is opened before the AWiki overlay. */
    loadAwiki: () => Promise<AwikiActionResult>;
    loadIntegration: () => Promise<AwikiActionResult<AwikiIntegrationView | null>>;
    saveIntegration: (fields: AwikiIntegrationFields, current: AwikiIntegrationView | null) => Promise<AwikiActionResult<AwikiIntegrationView>>;
    rotateIntegrationId: (current: AwikiIntegrationView) => Promise<AwikiActionResult<AwikiIntegrationView>>;
    closeIntegration: (current: AwikiIntegrationView) => Promise<AwikiActionResult<AwikiIntegrationView>>;
    reopenIntegration: (fields: AwikiIntegrationFields, current: AwikiIntegrationView) => Promise<AwikiActionResult<AwikiIntegrationView>>;
    listOwnedGroups: () => Promise<AwikiActionResult<readonly AwikiGroupSnapshot[]>>;
    openIntegrationGuide: () => void;
}
/** Full composed settings-section props. */
export type AwikiSettingsSectionProps = PropsRuntime<'settings.section'> & PropsLocale<'settings.awiki'> & InjectFace<AwikiSettingsInjected>;
declare function hasDomainOverride(snapshot: SettingsScopeSnapshot<AwikiSettings>): boolean;
/** Render only the settings owned by the main AWiki identity and messaging plugin. */
export declare function AwikiSettingsSection(props: AwikiSettingsSectionProps): ReactNode;
export { hasDomainOverride };
//# sourceMappingURL=AwikiSettingsSection.d.ts.map