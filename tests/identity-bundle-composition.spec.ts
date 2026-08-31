import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('standalone ANP Identity bundle ownership', () => {
  it('leaves identity service/provider insertion to the identity plugin layer', async () => {
    const patch = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8')
    expect(patch).not.toMatch(/^\s*- id: anp-identity(?:-provider)?$/gmu)
    expect(patch.match(/^\s*- id: awiki(?:-provider|-summary-provider)?$/gmu)).toHaveLength(3)
  })
})
