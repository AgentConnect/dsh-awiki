/** Isolated Integration management panel for the full AWiki plugin. */
import { type ReactNode } from 'react';
import type { AwikiGroupSnapshot, AwikiIntegrationFields, AwikiIntegrationView } from '@awiki/dsh-plugin/types';
import type { AwikiActionResult } from './controller.ts';
import type { AwikiSettingsKey } from './settings-locales.ts';
export interface AwikiIntegrationSettingsActions {
    loadIntegration: () => Promise<AwikiActionResult<AwikiIntegrationView | null>>;
    saveIntegration: (fields: AwikiIntegrationFields, current: AwikiIntegrationView | null) => Promise<AwikiActionResult<AwikiIntegrationView>>;
    rotateIntegrationId: (current: AwikiIntegrationView) => Promise<AwikiActionResult<AwikiIntegrationView>>;
    closeIntegration: (current: AwikiIntegrationView) => Promise<AwikiActionResult<AwikiIntegrationView>>;
    listOwnedGroups: () => Promise<AwikiActionResult<readonly AwikiGroupSnapshot[]>>;
    openIntegrationGuide: () => void;
}
interface Props extends AwikiIntegrationSettingsActions {
    readonly t: (key: AwikiSettingsKey, params?: Record<string, string>) => string;
}
/** Render management independently so Gateway errors never disable ordinary AWiki settings. */
export declare function AwikiIntegrationSettings(props: Props): ReactNode;
export {};
//# sourceMappingURL=AwikiIntegrationSettings.d.ts.map