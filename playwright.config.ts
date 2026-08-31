import { defineConfig, devices } from '@playwright/test'
import { join } from 'node:path'

const outputRoot = process.env.DSH_AWIKI_E2E_OUTPUT_DIR ?? '.artifacts/e2e/playwright'

export default defineConfig({
  testDir: './tests/e2e/specs',
  outputDir: join(outputRoot, 'playwright'),
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  forbidOnly: process.env.CI === 'true',
  retries: process.env.CI === 'true' ? 1 : 0,
  reporter: [['line'], ['json', { outputFile: join(outputRoot, 'playwright-report.json') }]],
  use: {
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'smoke-chromium',
      testMatch: /harness-smoke\.spec\.ts/u,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'live-setup',
      testMatch: /live-setup\.spec\.ts/u,
      retries: 0,
      use: {
        ...devices['Desktop Chrome'],
        trace: 'off',
        screenshot: 'off',
        video: 'off',
      },
    },
    {
      name: 'live-chromium',
      testMatch: /live-(?:direct|group|restart)\.spec\.ts/u,
      dependencies: ['live-setup'],
      retries: 0,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
