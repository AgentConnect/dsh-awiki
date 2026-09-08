/** Shared strict version comparison for update presentation and Host gates. */
export function assertVersion(value: string): void {
  if (value.length > 256 || !/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u.test(value)) {
    throw new Error('invalid semantic version')
  }
}

export function compareVersions(left: string, right: string): number {
  assertVersion(left)
  assertVersion(right)
  const parse = (value: string): { core: bigint[]; prerelease?: string[] } => {
    const withoutBuild = value.split('+', 1)[0]!
    const separator = withoutBuild.indexOf('-')
    const core = (separator < 0 ? withoutBuild : withoutBuild.slice(0, separator)).split('.').map(BigInt)
    return separator < 0 ? { core } : { core, prerelease: withoutBuild.slice(separator + 1).split('.') }
  }
  const a = parse(left)
  const b = parse(right)
  for (let index = 0; index < 3; index += 1) {
    const difference = a.core[index]! - b.core[index]!
    if (difference !== 0n) return difference < 0n ? -1 : 1
  }
  if (a.prerelease === undefined || b.prerelease === undefined) {
    return a.prerelease === b.prerelease ? 0 : a.prerelease === undefined ? 1 : -1
  }
  for (let index = 0; index < Math.min(a.prerelease.length, b.prerelease.length); index += 1) {
    const leftPart = a.prerelease[index]!
    const rightPart = b.prerelease[index]!
    if (leftPart === rightPart) continue
    const leftNumeric = /^\d+$/u.test(leftPart)
    const rightNumeric = /^\d+$/u.test(rightPart)
    if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1
    if (leftNumeric) return BigInt(leftPart) < BigInt(rightPart) ? -1 : 1
    return leftPart < rightPart ? -1 : 1
  }
  if (a.prerelease.length !== b.prerelease.length) {
    return a.prerelease.length < b.prerelease.length ? -1 : 1
  }
  return 0
}
