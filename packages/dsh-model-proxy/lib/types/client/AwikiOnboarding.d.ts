/** Model Proxy opt-in step shown before the official API-key step. */
import { type ReactNode } from 'react';
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { AwikiClientBridge, AwikiController } from '@awiki/dsh-plugin/client';
import type { ModelAvailabilityController } from './model-availability-controller.ts';
import type { AwikiModelProxyController } from './model-proxy-controller.ts';
export interface AwikiOnboardingInjected {
    hooks: {
        awikiOnboarding: AwikiController;
        awikiModelAvailability: ModelAvailabilityController;
        awikiModelProxy: AwikiModelProxyController;
    };
    identity: AwikiController;
    IdentityAccess: AwikiClientBridge['IdentityAccess'];
    clearLocalIdentity: AwikiClientBridge['clearLocalIdentity'];
    availability: ModelAvailabilityController;
    models: AwikiModelProxyController;
    rechargeEnabled: boolean;
}
export type AwikiOnboardingProps = PropsRuntime<'settings.onboarding'> & {
    readonly dismiss?: () => void;
} & PropsLocale<'settings.awiki-model-proxy'> & InjectFace<AwikiOnboardingInjected>;
export declare function AwikiOnboarding(props: AwikiOnboardingProps): ReactNode;
//# sourceMappingURL=AwikiOnboarding.d.ts.map