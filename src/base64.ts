/** Linear-time standard Base64 syntax validation for bounded binary payloads. */

function base64Character(code: number): boolean {
  return (code >= 0x41 && code <= 0x5a)
    || (code >= 0x61 && code <= 0x7a)
    || (code >= 0x30 && code <= 0x39)
    || code === 0x2b
    || code === 0x2f
}

/** Reject misplaced padding and non-Base64 bytes without recursive regexp matching. */
export function standardBase64Syntax(value: string): boolean {
  if (value.length % 4 !== 0) return false
  let dataEnd = value.length
  if (dataEnd > 0 && value.charCodeAt(dataEnd - 1) === 0x3d) dataEnd -= 1
  if (dataEnd > 0 && value.charCodeAt(dataEnd - 1) === 0x3d) dataEnd -= 1
  for (let index = 0; index < dataEnd; index += 1) {
    if (!base64Character(value.charCodeAt(index))) return false
  }
  for (let index = dataEnd; index < value.length; index += 1) {
    if (value.charCodeAt(index) !== 0x3d) return false
  }
  return true
}
