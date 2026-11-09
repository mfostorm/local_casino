import { defineConfig } from '@playwright/test';
const testDatabase = process.env.MIHRYU_TEST_DB || `/tmp/mihryu-e2e-${Date.now()}.sqlite`;
process.env.MIHRYU_TEST_DB = testDatabase;
export default defineConfig({
  testDir: 'tests/browser',
  timeout: 90000,
  expect: { timeout: 12000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    headless: true,
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
      args: ['--no-sandbox'],
    },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npx tsx tests/browser/seed.ts && NODE_ENV=production PORT=3100 DB_PATH=${testDatabase} npx tsx server/index.ts`,
    url: 'http://127.0.0.1:3100/api/health',
    reuseExistingServer: false,
    timeout: 30000,
  },
});
