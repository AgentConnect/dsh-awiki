/** Model Proxy account, recharge, and usage settings contributed to DSH settings. */
import { type ReactNode } from 'react';
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { AwikiController } from '@awiki/dsh-plugin/client';
import type { AwikiModelProxyController } from './model-proxy-controller.ts';
/** Browser actions and reactive Host-owned state. */
export interface ModelProxySettingsInjected {
    hooks: {
        /** Sanitized loopback model account state. */
        awikiModelProxy: AwikiModelProxyController;
        /** Shared AWiki identity and sign-in state. */
        awikiSession: AwikiController;
    };
    /** Shared identity actions; private keys remain Host-owned. */
    identity: AwikiController;
    /** Host-only model account actions; credentials never enter this face. */
    models: AwikiModelProxyController;
    /** Client release gate for creating recharge orders. */
    rechargeEnabled: boolean;
}
/** Full composed settings-section props. */
export type ModelProxySettingsSectionProps = PropsRuntime<'settings.section'> & PropsLocale<'settings.awiki-model-proxy'> & InjectFace<ModelProxySettingsInjected>;
/** Render Model Proxy account, recharge, model state, and usage controls. */
export declare function ModelProxySettingsSection(props: ModelProxySettingsSectionProps): ReactNode;
declare function parseAmountCents(value: string): number | undefined;
declare function openPaymentUrl(value: string): boolean;
export { openPaymentUrl, parseAmountCents };
//# sourceMappingURL=ModelProxySettingsSection.d.ts.map