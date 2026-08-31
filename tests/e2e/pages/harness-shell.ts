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
