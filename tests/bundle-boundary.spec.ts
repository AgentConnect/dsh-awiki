import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('DSH bundle ownership', () => {
  it('leaves ANP Identity entries to the independent identity bundle', () => {
    const patch = readFileSync(join(process.cwd(), 'cordis.patch.yml'), 'utf8')

    expect(patch).toContain('- id: awiki')
    expect(patch).toContain('- id: awiki-provider')
    expect(patch).toContain("allowInsecureLoopbackForTesting: !!js process.env.DSH_AWIKI_ALLOW_INSECURE_LOOPBACK_FOR_TESTING === 'true'")
    expect(patch).not.toContain('- id: anp-identity')
    expect(patch).not.toContain('- id: anp-identity-provider')
  })
})
