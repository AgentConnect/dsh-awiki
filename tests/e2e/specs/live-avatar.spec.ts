import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import { test, expect } from '../fixtures/test.ts'
import { readLiveHandoff } from '../fixtures/live-handoff.ts'
import { loadProtectedE2eConfig } from '../fixtures/protected-config.ts'
import { CliPeer } from '../fixtures/cli-peer.ts'
import { completeHarnessBusinessEntry } from '../pages/harness-shell.ts'
import { openAwiki, closeAwiki, openDirectConversation } from '../pages/awiki-conversation-page.ts'

test.beforeAll(async () => {
  // Build/setup has its own budget; visible interaction assertions retain theirs.
  test.setTimeout(360_000)
  const config = await loadProtectedE2eConfig(process.env.DSH_AWIKI_E2E_CONFIG!)
  const handoff = await readLiveHandoff()
  await CliPeer.reopen(config, handoff.cli).setAvatarFixture(await readFile(new URL('../performance/avatar.jpg', import.meta.url)), config.cliSourceRef)
})

test('[DSH-WEB-AVATAR-001] visible avatar crop, replacement, warm cache and clear converge with the public profile', async ({ page, harness }) => {
  const config = await loadProtectedE2eConfig(process.env.DSH_AWIKI_E2E_CONFIG!)
  const handoff = await readLiveHandoff()
  const cli = CliPeer.reopen(config, handoff.cli)
  await page.goto(harness.url, { waitUntil: 'domcontentloaded' })
  await completeHarnessBusinessEntry(page)
  await openAwiki(page)
  const avatar = page.getByRole('button', { name: '设置头像', exact: true })
  const editor = page.getByRole('dialog', { name: '设置头像', exact: true })
  const publicProfile = async () => {
    const response = await page.request.post(`${config.targetBinding.userServiceUrl}/user-service/v1/did/profile/rpc`, {
      data: { jsonrpc: '2.0', id: 'avatar-public', method: 'get_public_profile', params: { did: handoff.dsh.did } },
    })
    expect(response.ok()).toBe(true)
    return (await response.json()).result as { avatar_uri: string | null; avatar_thumbnail_uri: string | null }
  }
  let previous: string | null = null
  for (const index of [0, 1]) {
    await avatar.click()
    await expect(editor.getByRole('button', { name: '选择照片' })).toBeEnabled()
    await editor.locator('input[type=file]').setInputFiles(fileURLToPath(new URL(`../fixtures/avatars/source-${index}.png`, import.meta.url)))
    await expect(editor.getByRole('img', { name: '新头像预览', exact: true })).toBeVisible()
    await expect(editor.getByRole('slider')).toHaveCount(0)
    const source = editor.locator('canvas[aria-label="固定的头像图片"]')
    const fixed = await source.boundingBox()
    const selection = editor.locator('.ReactCrop__crop-selection')
    const before = await selection.boundingBox()
    const corner = editor.getByRole('button', { name: '右下角', exact: true })
    const cornerBox = await corner.boundingBox()
    await page.mouse.move(cornerBox!.x + cornerBox!.width / 2, cornerBox!.y + cornerBox!.height / 2)
    await page.mouse.down()
    await page.mouse.move(cornerBox!.x - 40, cornerBox!.y - 40, { steps: 8 })
    await page.mouse.up()
    expect((await selection.boundingBox())!.width).toBeLessThan(before!.width)
    await selection.press('ArrowRight')
    expect(await source.boundingBox()).toEqual(fixed)
    await editor.getByRole('button', { name: '保存头像', exact: true }).click()
    await expect(editor).toHaveCount(0, { timeout: 30_000 })
    await expect(avatar.locator('img')).toBeVisible()
    const profile = await publicProfile()
    const publicImage = new URL(profile.avatar_uri!)
    expect(publicImage.origin).toBe(new URL(config.targetBinding.userServiceUrl).origin)
    expect(publicImage.pathname).toMatch(/^\/avatars\/[0-9a-f]{64}\/512\.jpg$/u)
    expect(profile.avatar_uri).not.toBe(previous)
    expect(profile.avatar_thumbnail_uri).toBe(profile.avatar_uri!.replace('/512.jpg', '/128.jpg'))
    const image = await page.request.get(profile.avatar_uri!)
    expect(image.ok()).toBe(true); expect((await image.body()).length).toBeLessThanOrEqual(262144)
    if (previous !== null) expect((await page.request.get(previous)).ok()).toBe(true)
    previous = profile.avatar_uri
  }
  // The independent CLI must continue resolving this account after avatar changes.
  expect(await cli.resolveDid(handoff.dsh.handle)).toBe(handoff.dsh.did)
  await openDirectConversation(page, handoff.cli.handle)
  const peerAvatar = page.getByRole('button', { name: /^查看.*的头像$/u })
  await expect(peerAvatar).toBeVisible()
  await peerAvatar.click()
  const large = page.getByRole('dialog', { name: '头像', exact: true })
  await expect(large.getByRole('img', { name: '头像大图' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(large).toHaveCount(0)
  let warmImageRequests = 0
  const observeImage = (request: { url(): string }) => {
    if (new URL(request.url()).pathname.startsWith('/avatars/')) warmImageRequests++
  }
  page.on('request', observeImage)
  await closeAwiki(page)
  await openAwiki(page)
  await expect(avatar.locator('img')).toBeVisible()
  expect(warmImageRequests).toBe(0)
  // Drop JS memory and make only the public image network unavailable. The real
  // IndexedDB cache must survive a page reload without a replacement response.
  await page.route('**/avatars/**', route => route.abort('internetdisconnected'))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await completeHarnessBusinessEntry(page)
  await openAwiki(page)
  await expect(avatar.locator('img')).toBeVisible()
  expect(warmImageRequests).toBe(0)
  await page.unroute('**/avatars/**')
  page.off('request', observeImage)
  // Restart the actual Host/Core on the same private state root.
  await harness.pause()
  await page.goto(await harness.restart(), { waitUntil: 'domcontentloaded' })
  await completeHarnessBusinessEntry(page)
  await openAwiki(page)
  await expect(avatar.locator('img')).toBeVisible()
  expect((await publicProfile()).avatar_uri).toBe(previous)
  await avatar.click()
  await editor.getByRole('button', { name: '恢复默认头像' }).click()
  expect((await publicProfile()).avatar_uri).toBe(previous)
  await editor.getByRole('button', { name: '确认恢复默认头像', exact: true }).click()
  await expect(editor).toHaveCount(0, { timeout: 30_000 })
  await expect(avatar.locator('img')).toHaveCount(0)
  const cleared = await publicProfile()
  expect(cleared.avatar_uri).toBeNull(); expect(cleared.avatar_thumbnail_uri).toBeNull()
  expect((await page.request.get(previous!)).ok()).toBe(true)
})
