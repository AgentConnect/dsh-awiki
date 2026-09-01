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
