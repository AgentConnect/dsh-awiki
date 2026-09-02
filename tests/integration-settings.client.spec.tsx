// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AwikiIntegrationSettings } from '../src/client/AwikiIntegrationSettings.tsx'
import { zh, type AwikiSettingsKey } from '../src/client/settings-locales.ts'
import type { AwikiIntegrationView } from '../src/types.ts'

afterEach(() => cleanup())

function translate(key: AwikiSettingsKey): string { return zh[key] }

const created: AwikiIntegrationView = {
  id: 'integration-id',
  publicId: 'agi_example',
  integrationUrl: 'https://awiki.info/guest/i/agi_example',
  owner: {
    tenantId: 'main',
    handle: 'developer.awiki.info',
    currentDid: 'did:wba:awiki.info:developer',
    displayName: 'Developer',
  },
  productName: 'Example product',
  description: '',
  contactEnabled: true,
  contactDescription: '',
  groupTargets: [],
  status: 'active',
  revision: 1,
}

describe('AWiki Integration settings', () => {
  it('creates the only Integration and exposes its fixed public URL', async () => {
    const saveIntegration = vi.fn(async () => ({ ok: true as const, value: created }))
    const guide = vi.fn()
    render(<AwikiIntegrationSettings
      t={translate}
      loadIntegration={async () => ({ ok: true, value: null })}
      listOwnedGroups={async () => ({ ok: true, value: [] })}
      saveIntegration={saveIntegration}
      rotateIntegrationId={async () => ({ ok: true, value: created })}
      closeIntegration={async () => ({ ok: true, value: { ...created, status: 'closed' } })}
      reopenIntegration={async () => ({ ok: true, value: created })}
      openIntegrationGuide={guide}
    />)

    const name = await screen.findByLabelText('产品或插件名称')
    expect(name.getAttribute('placeholder')).toBe('请输入产品或插件名称')
    expect(screen.getByLabelText('总体介绍').getAttribute('placeholder')).toBe('请输入产品、插件或开发者的总体介绍')
    expect(screen.getByLabelText('开发者私聊介绍').getAttribute('placeholder')).toBe('请输入访客联系开发者时看到的介绍')
    fireEvent.change(name, { target: { value: 'Example product' } })
    fireEvent.click(screen.getByRole('button', { name: '创建 Integration' }))
    await waitFor(() => expect(saveIntegration).toHaveBeenCalledWith({
      productName: 'Example product',
      description: '',
      contactEnabled: true,
      contactDescription: '',
      groupTargets: [],
    }, null))
    expect(await screen.findByText('https://awiki.info/guest/i/agi_example')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '查看集成指南' }))
    expect(guide).toHaveBeenCalledOnce()
  })

  it('isolates an owned-group lookup failure from the rest of AWiki settings', async () => {
    render(<AwikiIntegrationSettings
      t={translate}
      loadIntegration={async () => ({ ok: true, value: null })}
      listOwnedGroups={async () => ({ ok: false, error: 'remote unavailable' })}
      saveIntegration={async () => ({ ok: true, value: created })}
      rotateIntegrationId={async () => ({ ok: true, value: created })}
      closeIntegration={async () => ({ ok: true, value: created })}
      reopenIntegration={async () => ({ ok: true, value: created })}
      openIntegrationGuide={() => {}}
    />)

    expect(await screen.findByText('暂时无法读取你创建的社群，请稍后重试。')).toBeTruthy()
    expect((screen.getByLabelText('产品或插件名称') as HTMLInputElement).disabled).toBe(false)
  })

  it('keeps group identity and its single-line introduction in separate rows', async () => {
    const groupDid = 'did:wba:awiki.info:groups:very-long-group-identifier'
    const groupName = 'A very long community display name'
    const integration = {
      ...created,
      groupTargets: [{
        id: 'group-target-id',
        groupDid,
        displayName: groupName,
        avatarUrl: null,
        description: 'Community description',
        availability: 'eligible' as const,
      }],
    }
    render(<AwikiIntegrationSettings
      t={translate}
      loadIntegration={async () => ({ ok: true, value: integration })}
      listOwnedGroups={async () => ({ ok: true, value: [{ groupDid, title: groupName }] })}
      saveIntegration={async () => ({ ok: true, value: integration })}
      rotateIntegrationId={async () => ({ ok: true, value: integration })}
      closeIntegration={async () => ({ ok: true, value: integration })}
      reopenIntegration={async () => ({ ok: true, value: integration })}
      openIntegrationGuide={() => {}}
    />)

    expect((await screen.findByTitle(groupName)).tagName).toBe('STRONG')
    expect(screen.getByTitle(groupDid).tagName).toBe('SMALL')
    const introduction = screen.getByLabelText('社群介绍') as HTMLInputElement
    expect(introduction.tagName).toBe('INPUT')
    expect(introduction.placeholder).toBe('请输入访客加入这个社群前看到的介绍')
    expect(introduction.value).toBe('Community description')
  })

  it('edits a closed configuration and reopens it with a new public entry action', async () => {
    const closed = { ...created, publicId: null, integrationUrl: null, status: 'closed' as const, revision: 2 }
    const reopened = {
      ...created,
      publicId: 'agi_reopened',
      integrationUrl: 'https://awiki.info/guest/i/agi_reopened',
      revision: 3,
    }
    const reopenIntegration = vi.fn(async () => ({ ok: true as const, value: reopened }))
    render(<AwikiIntegrationSettings
      t={translate}
      loadIntegration={async () => ({ ok: true, value: closed })}
      listOwnedGroups={async () => ({ ok: true, value: [] })}
      saveIntegration={async () => ({ ok: true, value: reopened })}
      rotateIntegrationId={async () => ({ ok: true, value: reopened })}
      closeIntegration={async () => ({ ok: true, value: closed })}
      reopenIntegration={reopenIntegration}
      openIntegrationGuide={() => {}}
    />)

    expect(await screen.findByText('公开入口已关闭')).toBeTruthy()
    const name = screen.getByLabelText('产品或插件名称') as HTMLInputElement
    expect(name.disabled).toBe(false)
    fireEvent.change(name, { target: { value: 'Reopened product' } })
    fireEvent.click(screen.getByRole('button', { name: '创建新的公开入口' }))
    await waitFor(() => expect(reopenIntegration).toHaveBeenCalledWith({
      productName: 'Reopened product',
      description: '',
      contactEnabled: true,
      contactDescription: '',
      groupTargets: [],
    }, closed))
    expect(await screen.findByText('https://awiki.info/guest/i/agi_reopened')).toBeTruthy()
  })
})
