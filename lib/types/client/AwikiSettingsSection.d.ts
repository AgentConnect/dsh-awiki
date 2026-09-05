/** AWiki tenant, local-data, and optional-integration settings. */
import { type ReactNode } from 'react';
import type { HostObservable, InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { SettingsScope } from '@deepseek-ai/dsh-client-runtime/client';
import type { AwikiSettings } from '../settings.ts';
import type { AwikiGroupSnapshot, AwikiIntegrationFields, AwikiIntegrationView } from '../types.ts';
import type { AwikiActionResult, AwikiView } from './controller.ts';
import type { AwikiTenantScope } from './settings-controller.ts';
import { type AwikiDevicesProps } from './AwikiDevices.tsx';
export interface AwikiSettingsInjected extends Omit<AwikiDevicesProps, 'active' | 'pending'> {
    hooks: {
        awikiTenants: AwikiTenantScope;
        awikiSettings: SettingsScope<AwikiSettings>;
        awiki: HostObservable<AwikiView>;
    };
    /** Legacy migration setting retained for older browser bundles. */
    saveDomain: (domain: string) => Promise<void>;
    /** Legacy migration setting retained for older browser bundles. */
    resetDomain: () => Promise<void>;
    createTenant: (displayName: string, domain: string) => Promise<void>;
    renameTenant: (tenantId: string, displayName: string) => Promise<void>;
    switchTenant: (tenantId: string) => Promise<void>;
    archiveTenant: (tenantId: string) => Promise<void>;
    refreshUpdatePolicy: () => Promise<void>;
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
export type AwikiSettingsSectionProps = PropsRuntime<'settings.section'> & PropsLocale<'settings.awiki'> & InjectFace<AwikiSettingsInjected>;
export declare function AwikiSettingsSection(props: AwikiSettingsSectionProps): ReactNode;
//# sourceMappingURL=AwikiSettingsSection.d.ts.map