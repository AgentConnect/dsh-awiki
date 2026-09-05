/** Client-safe AWiki Handle provider domain constants and validation. */
/** Default Handle provider domain for new AWiki deployments. */
export declare const DEFAULT_AWIKI_DOMAIN: string;
/** Field carrying the Handle provider domain in the AWiki settings namespace. */
export declare const AWIKI_DOMAIN_FIELD = "domain";
/** Settings namespace owned by the AWiki plugin. */
export declare const AWIKI_SETTINGS_NAMESPACE = "awiki";
/** Normalize and validate one DNS provider domain. */
export declare function normalizeAwikiDomain(raw: string, field?: string): string;
//# sourceMappingURL=domain.d.ts.map