/** Registration presentation and Handle normalization; admission is owned by the server. */

export const SHORT_HANDLE_INVITE_MESSAGE = '注册少于5位的handle需要使用邀请码，目前暂不支持自主注册。'

const HANDLE_LOCAL_PART = /^(?!-)(?!.*--)[a-z0-9-]{1,63}(?<!-)$/u

/** Return the canonical local part when the input has valid WNS local-part syntax. */
export function registrationHandleLocalPart(value: string): string | undefined {
  let normalized = value.trim().toLowerCase()
  if (normalized.startsWith('wba://')) normalized = normalized.slice('wba://'.length)
  const dot = normalized.indexOf('.')
  const localPart = (dot < 0 ? normalized : normalized.slice(0, dot)).trim()
  return HANDLE_LOCAL_PART.test(localPart) ? localPart : undefined
}
