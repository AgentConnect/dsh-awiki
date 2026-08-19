/** AWiki identity and model opt-in step shown before the official API-key step. */
import { type ReactNode } from 'react';
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { AwikiController } from './controller.ts';
import type { ModelAvailabilityController } from './model-availability-controller.ts';
import type { AwikiModelProxyController } from './model-proxy-controller.ts';
export interface AwikiOnboardingInjected {
    hooks: {
        awikiOnboarding: AwikiController;
        awikiModelAvailability: ModelAvailabilityController;
        awikiModelProxy: AwikiModelProxyController;
    };
    identity: AwikiController;
    availability: ModelAvailabilityController;
    models: AwikiModelProxyController;
}
export type AwikiOnboardingProps = PropsRuntime<'settings.onboarding'> & {
    readonly dismiss?: () => void;
} & PropsLocale<'settings.awiki'> & InjectFace<AwikiOnboardingInjected>;
export declare function AwikiOnboarding(props: AwikiOnboardingProps): ReactNode;
//# sourceMappingURL=AwikiOnboarding.d.ts.map