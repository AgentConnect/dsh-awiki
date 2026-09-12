export function verifyReleaseVersions(manifest) {
  const stable = /^\d+\.\d+\.\d+$/u
  const rc = /^\d+\.\d+\.\d+-rc\.\d+$/u
  for (const name of ['@awiki/im-core-node', '@agent-network-protocol/dsh-anp-identity']) {
    const version = manifest.dependencies?.[name] ?? manifest.devDependencies?.[name]
    const coordinatedRc = name === '@agent-network-protocol/dsh-anp-identity'
      && rc.test(manifest.version) && rc.test(version)
    if (!stable.test(version) && !coordinatedRc) {
      throw new Error(`${name}: release requires an exact stable version or a coordinated Identity RC`)
    }
  }
}
