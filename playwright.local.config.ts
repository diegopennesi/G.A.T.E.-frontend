import { defineConfig } from '@playwright/test'

// Explicit opt-in: requires the isolated backend documented in LOCAL_VALIDATION.md.
export default defineConfig({
  testDir: './tests/local',
  outputDir: './local-test-results',
  workers: 1,
  timeout: 90000,
  use: { baseURL: 'http://127.0.0.1:5180', browserName: 'chromium', channel: 'chrome', trace: 'off' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5180 --strictPort',
    env: { VITE_API_BASE_URL: 'http://127.0.0.1:8081/api/v1' },
    url: 'http://127.0.0.1:5180',
    reuseExistingServer: false,
  },
})
