import { expect, type Page } from '@playwright/test'

export async function openAwiki(page: Page): Promise<void> {
  const launcher = page.getByRole('button', { name: /^打开 AWiki/u })
  await expect(launcher).toBeVisible()
  await launcher.click()
  await expect(page.getByRole('dialog', { name: 'AWiki' })).toBeVisible()
}

export async function closeAwiki(page: Page): Promise<void> {
  await page.getByRole('button', { name: '关闭 AWiki' }).click()
  await expect(page.getByRole('dialog', { name: 'AWiki' })).toBeHidden()
}

export async function openDirectConversation(page: Page, peer: string): Promise<void> {
  await page.getByRole('button', { name: '发起会话' }).click()
  await page.getByText('发起私聊', { exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '发起私聊' })
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Handle').fill(peer)
  await dialog.getByRole('button', { name: '打开会话' }).click()
  await expect(page.getByRole('log', { name: '消息记录' })).toBeVisible()
}

export async function sendVisibleText(page: Page, text: string): Promise<void> {
  const composer = page.getByPlaceholder('输入消息')
  await composer.fill(text)
  await page.getByRole('button', { name: '发送消息' }).click()
  await expect(page.getByRole('log', { name: '消息记录' }).getByText(text, { exact: true })).toHaveCount(1)
}

export async function createGroup(page: Page, title: string, didDomain = 'rwiki.cn'): Promise<string> {
  await page.getByRole('button', { name: '发起会话' }).click()
  await page.getByRole('menuitem', { name: '发起群聊' }).click()
  const dialog = page.getByRole('dialog', { name: '发起群聊' })
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('群聊名称').fill(title)
  await dialog.getByRole('button', { name: '创建群聊' }).click()
  await expect(dialog).toBeHidden({ timeout: 60_000 })
  await expect(page.getByRole('button', { name: '打开群聊详情' })).toBeVisible()
  await page.getByRole('button', { name: '打开群聊详情' }).click()
  const details = page.getByRole('complementary', { name: '群聊详情' })
  await expect(details).toBeVisible()
  const groupDid = await details.locator(`code[title^="did:wba:${didDomain}:groups:"]`).getAttribute('title')
  if (groupDid === null || !groupDid.startsWith(`did:wba:${didDomain}:groups:`)) {
    throw new Error('DSH E2E Group DID is invalid')
  }
  return groupDid
}

export async function inviteGroupMember(page: Page, member: string): Promise<void> {
  const details = page.getByRole('complementary', { name: '群聊详情' })
  await expect(details).toBeVisible()
  await details.getByLabel('邀请成员').fill(member)
  await details.getByRole('button', { name: '邀请群成员' }).click()
  await expect(details.getByRole('status')).toHaveText(`已邀请 ${member}`, { timeout: 60_000 })
  await details.getByRole('button', { name: '关闭群聊详情' }).click()
  await expect(details).toBeHidden()
}
