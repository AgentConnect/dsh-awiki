/** Model Proxy browser plugin: Quick Recharge settings and hosted-model onboarding. */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
export type { AwikiOnboardingInjected, AwikiOnboardingProps } from './AwikiOnboarding.tsx';
export type { ModelProxySettingsInjected, ModelProxySettingsSectionProps } from './ModelProxySettingsSection.tsx';
export type { ModelAvailabilityView } from './model-availability-controller.ts';
export type { AwikiModelProxyView } from './model-proxy-controller.ts';
/** Required services supplied by the main AWiki client and DSH browser runtime. */
export declare const inject: string[];
/** Register Model Proxy-owned Browser surfaces only when this package is installed. */
export declare function apply(ctx: ClientContext): Promise<() => void>;
//# sourceMappingURL=index.d.ts.map