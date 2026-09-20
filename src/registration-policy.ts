/** Registration presentation and Handle normalization; admission is owned by the server. */

export const SHORT_HANDLE_INVITE_MESSAGE = '此 Handle 注册需要邀请码，请输入后继续。'

const HANDLE_LOCAL_PART = /^(?!-)(?!.*--)[a-z0-9-]{1,63}(?<!-)$/u

/** Return the canonical local part when the input has valid WNS local-part syntax. */
export function registrationHandleLocalPart(value: string): string | undefined {
  let normalized = value.trim().toLowerCase()
  if (normalized.startsWith('wba://')) normalized = normalized.slice('wba://'.length)
  const dot = normalized.indexOf('.')
  const localPart = (dot < 0 ? normalized : normalized.slice(0, dot)).trim()
  return HANDLE_LOCAL_PART.test(localPart) ? localPart : undefined
}
