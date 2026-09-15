import { test, expect } from '@playwright/test'
import { openAwikiSettings } from '../pages/harness-shell.ts'

// Browser-level helper regression: no Harness process or remote identity is used.
for (const collapsed of [false, true]) {
  test(`reopened onboarding before settings with sidebar ${collapsed ? 'collapsed' : 'expanded'}`, async ({ page }) => {
    test.setTimeout(15_000)
    await page.setContent(`
      <main id="shell" aria-hidden="true">
        <button id="expand" ${collapsed ? '' : 'hidden'}>Expand sidebar</button>
        <button id="settings" ${collapsed ? 'hidden' : ''}>Settings</button>
      </main>
      <div role="dialog" aria-label="Add an API key to get started" id="onboarding">
        <button id="later">Configure later</button>
      </div>
      <div role="dialog" aria-label="Settings" id="settingsDialog" hidden>
        <button id="awiki">AWiki</button>
        <div role="tablist" aria-label="AWiki settings" id="tabs" hidden>
          <button role="tab">Tenant</button>
        </div>
      </div>
      <script>
        document.getElementById('later').onclick = () => {
          document.getElementById('onboarding').remove();
          document.getElementById('shell').removeAttribute('aria-hidden');
        };
        document.getElementById('expand').onclick = () => {
          document.getElementById('expand').hidden = true;
          document.getElementById('settings').hidden = false;
        };
        document.getElementById('settings').onclick = () => {
          document.getElementById('settingsDialog').hidden = false;
        };
        document.getElementById('awiki').onclick = () => {
          document.getElementById('tabs').hidden = false;
        };
      </script>
    `)

    await openAwikiSettings(page)

    await expect(page.getByRole('dialog', { name: 'Add an API key to get started' })).toHaveCount(0)
    await expect(page.getByRole('tablist', { name: 'AWiki settings' })).toBeVisible()
  })
}
