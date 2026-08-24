import { describe, expect, it, vi } from 'vitest'
import {
  AWIKI_MODEL_PROXY_DEVELOPER_HANDLE,
  AWIKI_PLUGIN_INSTALL_COMMAND,
  contactModelProxyDeveloper,
  isAwikiMessagingAvailable,
} from '../src/client/contact-developer.ts'

describe('contactModelProxyDeveloper', () => {
  it('reports a missing messaging plugin when the AWiki client is absent', async () => {
    expect(isAwikiMessagingAvailable(undefined)).toBe(false)
    await expect(contactModelProxyDeveloper(undefined)).resolves.toEqual({
      ok: false,
      reason: 'plugin-missing',
    })
  })

  it('reports a missing messaging plugin when openDirectChat is unavailable', async () => {
    const client = {}
    expect(isAwikiMessagingAvailable(client)).toBe(false)
    await expect(contactModelProxyDeveloper(client)).resolves.toEqual({
      ok: false,
      reason: 'plugin-missing',
    })
  })

  it('treats an unbound messaging overlay as a missing plugin', async () => {
    const client = {
      openDirectChat: vi.fn(async () => ({ ok: false as const, error: 'AWiki 消息界面暂不可用' })),
    }
    await expect(contactModelProxyDeveloper(client)).resolves.toEqual({
      ok: false,
      reason: 'plugin-missing',
    })
    expect(client.openDirectChat).toHaveBeenCalledWith(AWIKI_MODEL_PROXY_DEVELOPER_HANDLE)
  })

  it('opens a direct chat with the maintainer handle', async () => {
    const client = {
      openDirectChat: vi.fn(async () => ({ ok: true as const })),
    }
    await expect(contactModelProxyDeveloper(client)).resolves.toEqual({ ok: true })
    expect(client.openDirectChat).toHaveBeenCalledWith('cgw.awiki.ai')
  })

  it('passes through other chat failures without asking to reinstall', async () => {
    const client = {
      openDirectChat: vi.fn(async () => ({ ok: false as const, error: '该 Handle 不存在' })),
    }
    await expect(contactModelProxyDeveloper(client)).resolves.toEqual({
      ok: false,
      reason: 'failed',
      error: '该 Handle 不存在',
    })
  })

  it('keeps the documented profile install command', () => {
    expect(AWIKI_PLUGIN_INSTALL_COMMAND).toBe('dsh plugin --profile web add @awiki/dsh-plugin@latest')
  })
})
