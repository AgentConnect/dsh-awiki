/** Product registration policy for invite-only short Handles. */

export const SHORT_HANDLE_INVITE_MESSAGE = '注册少于5位的handle需要使用邀请码，目前暂不支持自主注册。'

const HANDLE_LOCAL_PART = /^(?!-)(?!.*--)[a-z0-9-]{1,63}(?<!-)$/u

/** Return the canonical local part when the input has valid WNS local-part syntax. */
export function registrationHandleLocalPart(value: string): string | undefined {
  let normalized = value.trim().toLowerCase().replace(/^@+/u, '')
  if (normalized.startsWith('wba://')) normalized = normalized.slice('wba://'.length)
  const dot = normalized.indexOf('.')
  const localPart = (dot < 0 ? normalized : normalized.slice(0, dot)).trim()
  return HANDLE_LOCAL_PART.test(localPart) ? localPart : undefined
}

/** Three- and four-character Handle registrations require the unavailable invitation flow. */
export function shortHandleInviteRequired(value: string): boolean {
  const localPart = registrationHandleLocalPart(value)
  if (localPart === undefined) return false
  const length = Array.from(localPart).length
  return length === 3 || length === 4
}
