import { expect, type Page } from '@playwright/test'

/** Complete the two stock DSH first-run dialogs through their visible UI. */
export async function completeHarnessFirstRun(page: Page): Promise<void> {
  const testingNotice = page.getByRole('dialog', { name: 'Internal Testing Notice' })
  await expect(testingNotice).toBeVisible()
  await testingNotice.getByRole('button', { name: 'Continue' }).click()
  await expect(testingNotice).toBeHidden()

  const providerOnboarding = page.getByRole('dialog', { name: 'Add an API key to get started' })
  await expect(providerOnboarding).toBeVisible()
  await providerOnboarding.getByRole('button', { name: 'Configure later' }).click()
  await expect(providerOnboarding).toBeHidden()
}

/** Continue one fresh BrowserContext after the profile-level notice is already accepted. */
export async function completeHarnessBusinessEntry(page: Page): Promise<void> {
  const providerOnboarding = page.getByRole('dialog', { name: 'Add an API key to get started' })
  await expect(providerOnboarding).toBeVisible()
  await providerOnboarding.getByRole('button', { name: 'Configure later' }).click()
  await expect(providerOnboarding).toBeHidden()
}

/** Enter an isolated copied profile whether or not its testing notice was persisted. */
export async function completeHarnessCopiedProfileEntry(page: Page): Promise<void> {
  const testingNotice = page.getByRole('dialog', { name: 'Internal Testing Notice' })
  await Promise.race([
    testingNotice.waitFor({ state: 'visible' }).catch(() => undefined),
    page.getByRole('dialog', { name: 'Add an API key to get started' }).waitFor({ state: 'visible' }).catch(() => undefined),
    page.waitForTimeout(3_000),
  ])
  if (await testingNotice.isVisible()) {
    await testingNotice.getByRole('button', { name: 'Continue' }).click()
    await expect(testingNotice).toBeHidden()
  }
  const providerOnboarding = page.getByRole('dialog', { name: 'Add an API key to get started' })
  if (!await providerOnboarding.isVisible()) {
    await Promise.race([
      providerOnboarding.waitFor({ state: 'visible' }).catch(() => undefined),
      page.waitForTimeout(3_000),
    ])
  }
  if (await providerOnboarding.isVisible()) {
    await providerOnboarding.getByRole('button', { name: 'Configure later' }).click()
    await expect(providerOnboarding).toBeHidden()
  }
}

/** Open the AWiki settings section through the visible Harness settings UI. */
export async function openAwikiSettings(page: Page): Promise<void> {
  const awikiDialog = page.getByRole('dialog', { name: 'AWiki' })
  if (await awikiDialog.isVisible()) {
    await page.getByRole('button', { name: '关闭 AWiki' }).click()
    await expect(awikiDialog).toBeHidden()
  }
  // Async provider discovery can legitimately reopen stock Harness onboarding
  // after the first-run helper dismissed it. Close the visible modal through
  // its public UI before interacting with the settings button underneath.
  const providerOnboarding = page.getByRole('dialog', { name: 'Add an API key to get started' })
  if (await providerOnboarding.isVisible()) {
    await providerOnboarding.getByRole('button', { name: 'Configure later' }).click()
    await expect(providerOnboarding).toBeHidden()
  }
  const settingsButton = page.getByRole('button', { name: /^(?:设置|Settings)$/u })
  if (!await settingsButton.isVisible()) {
    await page.getByRole('button', { name: /^(?:打开侧边栏|Expand sidebar)$/u }).click()
    await expect(settingsButton).toBeVisible()
  }
  await settingsButton.click()
  const settingsDialog = page.getByRole('dialog', { name: /^(?:设置|Settings)$/u })
  await expect(settingsDialog).toBeVisible()
  await settingsDialog.getByRole('button', { name: 'AWiki', exact: true }).click()
  await expect(settingsDialog.getByRole('tablist', { name: /^(?:AWiki 设置|AWiki settings)$/u })).toBeVisible()
}

/** Close the visible Harness settings dialog. */
export async function closeHarnessSettings(page: Page): Promise<void> {
  const settingsDialog = page.getByRole('dialog', { name: /^(?:设置|Settings)$/u })
  await settingsDialog.getByRole('button', { name: /^(?:关闭|Close)$/u }).click()
  await expect(settingsDialog).toBeHidden()
}
