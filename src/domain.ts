/** Client-safe AWiki Handle provider domain constants and validation. */

/** Default Handle provider domain for new AWiki deployments. */
export const DEFAULT_AWIKI_DOMAIN = 'awiki.me'

/** Field carrying the Handle provider domain in the AWiki settings namespace. */
export const AWIKI_DOMAIN_FIELD = 'domain'

/** Settings namespace owned by the AWiki plugin. */
export const AWIKI_SETTINGS_NAMESPACE = 'awiki'

/** Normalize and validate one DNS provider domain. */
export function normalizeAwikiDomain(raw: string, field = 'domain'): string {
  const value = raw.trim().toLowerCase()
  const valid = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u
    .test(value)
  if (value.length > 253 || !valid) {
    throw new TypeError(`awiki: ${field} must contain a valid DNS domain`)
  }
  return value
}
