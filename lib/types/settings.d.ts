/** Durable AWiki settings shared by the Host service and browser settings page. */
import z from '@deepseek-ai/schemastery';
export { AWIKI_DOMAIN_FIELD, AWIKI_SETTINGS_NAMESPACE, DEFAULT_AWIKI_DOMAIN, normalizeAwikiDomain } from './domain.ts';
/** Persisted AWiki settings. */
export interface AwikiSettings {
    /** Handle provider domain used by registration and bare-Handle resolution. */
    readonly domain: string;
}
/** Durable AWiki schema exposed through the DSH settings service. */
export declare const AwikiSettingsSchema: z<AwikiSettings>;
/** Reject settings values that cannot be consumed as canonical domains. */
export declare function validateAwikiSettings(value: AwikiSettings): void;
//# sourceMappingURL=settings.d.ts.map