import { describe, expect, it } from 'vitest'
import { decodeBuiltinTenantConfig } from '../src/builtin-tenant-config.ts'

describe('build-injected tenant config', () => {
  it('accepts an exact two-slot override without retaining official domains', () => {
    const config = decodeBuiltinTenantConfig({
      schema_version: 1,
      default_slot: 'secondary',
      tenants: {
        primary: {
          display_name: { 'zh-CN': '甲', en: 'Alpha' },
          backend_origin: 'https://alpha.example',
          did_host: 'alpha.example',
        },
        secondary: {
          display_name: { 'zh-CN': '乙', en: 'Beta' },
          backend_origin: 'https://beta.example',
          did_host: 'beta.example',
        },
      },
    })
    expect(config.defaultSlot).toBe('secondary')
    expect(config.tenants.primary.backendOrigin).toBe('https://alpha.example')
    expect(JSON.stringify(config)).not.toContain('awiki.me')
    expect(JSON.stringify(config)).not.toContain('awiki.ai')
  })

  it('rejects non-HTTPS public origins and duplicate slots', () => {
    const config = {
      schema_version: 1,
      default_slot: 'primary',
      tenants: {
        primary: { display_name: { 'zh-CN': '甲', en: 'Alpha' }, backend_origin: 'http://alpha.example', did_host: 'alpha.example' },
        secondary: { display_name: { 'zh-CN': '乙', en: 'Beta' }, backend_origin: 'http://alpha.example', did_host: 'alpha.example' },
      },
    }
    expect(() => decodeBuiltinTenantConfig(config)).toThrow('HTTPS origin')
  })
})
