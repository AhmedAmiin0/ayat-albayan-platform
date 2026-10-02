import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

// Written by `pnpm env:local` (local) or the CI step after `supabase start`.
if (existsSync('.env')) process.loadEnvFile('.env');

// Dedicated ports so e2e never talks to a dev server (or anything else) on 3000/5173.
const API_PORT = 3100;
const WEB_PORT = 5180;
const WEB_URL = `http://localhost:${WEB_PORT}`;
/** tools/wa-stub for e2e (docs/12 §5): the API never reaches graph.facebook.com from here. */
const STUB_PORT = 4110; // = support/wa-stub.ts STUB_URL
const E2E_WA = {
  WA_API_BASE: `http://localhost:${STUB_PORT}`,
  WA_PHONE_NUMBER_ID: 'e2e-phone',
  WA_WABA_ID: 'e2e-waba',
  WA_ACCESS_TOKEN: 'e2e-token',
  WA_APP_ID: 'e2e-app',
  WA_APP_SECRET: 'e2e-app-secret',
  WA_VERIFY_TOKEN: 'e2e-verify',
};

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1, // one shared DB; journeys reset/seed it
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : 'list',
  globalSetup: './support/global-setup.ts',
  use: {
    baseURL: WEB_URL,
    locale: 'ar',
    timezoneId: 'Asia/Riyadh',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], locale: 'ar' },
      dependencies: ['setup'],
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], locale: 'ar' },
      dependencies: ['setup'],
    },
  ],
  webServer: [
    {
      command: 'node src/server.ts',
      cwd: '../tools/wa-stub',
      url: `http://localhost:${STUB_PORT}/__stub/health`,
      env: {
        WA_STUB_PORT: String(STUB_PORT),
        WA_WEBHOOK_URL: `http://localhost:${API_PORT}/webhooks/whatsapp`,
        WA_APP_SECRET: E2E_WA.WA_APP_SECRET,
        WA_PHONE_NUMBER_ID: E2E_WA.WA_PHONE_NUMBER_ID,
        WA_ACCESS_TOKEN: E2E_WA.WA_ACCESS_TOKEN,
      },
      reuseExistingServer: !process.env['CI'],
    },
    {
      command: 'node --env-file-if-exists=.env dist/main.js',
      cwd: '../apps/api',
      url: `http://localhost:${API_PORT}/health`,
      // Unroutable: an e2e USD quote must use the seeded fx_rates row, never the live currency API.
      // MESSAGING_ENABLED opens the env gate only: settings.messaging_enabled stays false (seeded
      // default) until a journey turns it on (support/wa-stub.ts), so queued rows stay queued.
      env: {
        PORT: String(API_PORT),
        WEB_ORIGIN: WEB_URL,
        FX_API_URL: 'http://127.0.0.1:9/',
        ...E2E_WA,
        MESSAGING_ENABLED: 'true',
      },
      reuseExistingServer: !process.env['CI'],
    },
    {
      command: `pnpm exec vite --port ${WEB_PORT} --strictPort`,
      cwd: '../apps/web',
      url: WEB_URL,
      env: { VITE_API_URL: `http://localhost:${API_PORT}` },
      reuseExistingServer: !process.env['CI'],
    },
  ],
});
