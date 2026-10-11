import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/ui',
  testMatch: '**/*.spec.ts',
  outputDir: './ui-test-results',
  fullyParallel: true,
  workers: 2,
  use: { baseURL: 'http://127.0.0.1:5176', browserName: 'chromium', channel: 'chrome', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5176 --strictPort',
    url: 'http://127.0.0.1:5176',
    reuseExistingServer: false,
  },
})
