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

  it('ships awiki.info as the complete production service default', () => {
    const patch = readFileSync(join(process.cwd(), 'cordis.patch.yml'), 'utf8')
    const envExample = readFileSync(join(process.cwd(), '.env.example'), 'utf8')

    expect(patch).toContain("userServiceUrl: !!js process.env.DSH_AWIKI_USER_SERVICE_URL ?? 'https://awiki.info'")
    expect(patch).toContain("userServiceDomain: !!js process.env.DSH_AWIKI_USER_SERVICE_DOMAIN ?? 'awiki.info'")
    expect(patch).toContain("messageServiceUrl: !!js process.env.DSH_AWIKI_MESSAGE_SERVICE_URL ?? 'https://awiki.info'")
    expect(patch).toContain("messageServiceDid: !!js process.env.DSH_AWIKI_MESSAGE_SERVICE_DID ?? 'did:wba:awiki.info'")
    expect(patch).toContain("messageServicePublicUrl: !!js process.env.DSH_AWIKI_MESSAGE_SERVICE_PUBLIC_URL ?? 'https://awiki.info'")
    expect(envExample).toContain('DSH_AWIKI_USER_SERVICE_DOMAIN=awiki.info')
  })
})
