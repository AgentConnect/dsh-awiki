/** Durable AWiki settings shared by the Host service and browser settings page. */
import z from '@deepseek-ai/schemastery';
import { AWIKI_DOMAIN_FIELD, DEFAULT_AWIKI_DOMAIN, normalizeAwikiDomain } from "./domain.js";
export { AWIKI_DOMAIN_FIELD, AWIKI_SETTINGS_NAMESPACE, DEFAULT_AWIKI_DOMAIN, normalizeAwikiDomain } from "./domain.js";
/** Durable AWiki schema exposed through the DSH settings service. */
export const AwikiSettingsSchema = z.object({
    [AWIKI_DOMAIN_FIELD]: z.string().default(DEFAULT_AWIKI_DOMAIN),
});
/** Reject settings values that cannot be consumed as canonical domains. */
export function validateAwikiSettings(value) {
    if (normalizeAwikiDomain(value.domain) !== value.domain) {
        throw new TypeError('awiki: domain must be lowercase and must not contain surrounding whitespace');
    }
}
//# sourceMappingURL=settings.js.map