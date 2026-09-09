/** One settings surface; tenant compatibility and Desktop release discovery retain separate owners. */
import { type ReactNode } from 'react';
import type { AwikiSettingsSectionProps } from './AwikiSettingsSection.tsx';
import type { AwikiTenantScopeSnapshot } from './settings-controller.ts';
type Props = Pick<AwikiSettingsSectionProps, 't' | 'refreshUpdatePolicy'> & {
    snapshot: AwikiTenantScopeSnapshot;
};
export declare function AwikiUpdates(props: Props): ReactNode;
export {};
//# sourceMappingURL=AwikiUpdates.d.ts.map