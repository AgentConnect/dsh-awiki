import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('DSH bundle ownership', () => {
  it('leaves ANP Identity entries to the independent identity bundle', () => {
    const patch = readFileSync(join(process.cwd(), 'cordis.patch.yml'), 'utf8')

    expect(patch).toContain('- id: awiki')
    expect(patch).toContain('- id: awiki-provider')
    expect(patch).not.toContain('- id: anp-identity')
    expect(patch).not.toContain('- id: anp-identity-provider')
  })

  it('keeps deployment values as explicit legacy migration inputs', () => {
    const patch = readFileSync(join(process.cwd(), 'cordis.patch.yml'), 'utf8')
    const envExample = readFileSync(join(process.cwd(), '.env.example'), 'utf8')

    expect(patch).toContain('userServiceUrl: !!js process.env.DSH_AWIKI_USER_SERVICE_URL')
    expect(patch).toContain('legacyTenantSlot: !!js process.env.DSH_AWIKI_LEGACY_TENANT_SLOT')
    expect(patch).not.toContain("?? 'https://awiki.info'")
    expect(envExample).toContain('DSH_AWIKI_USER_SERVICE_DOMAIN=awiki.ai')
  })
})
