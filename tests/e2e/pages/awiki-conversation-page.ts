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
  await expect(page.getByText(text, { exact: true })).toHaveCount(1)
}
