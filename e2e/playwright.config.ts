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
/** The second Meta number (docs/12 §13.12): both lines run in e2e, with distinct credentials. */
const E2E_WA_CHAT_KEYS = {
  WA_CHAT_PHONE_NUMBER_ID: 'e2e-chat-phone', // = support/wa-lines.ts CHAT_PN
  WA_CHAT_WABA_ID: 'e2e-chat-waba',
  WA_CHAT_ACCESS_TOKEN: 'e2e-chat-token',
  WA_CHAT_APP_SECRET: 'e2e-chat-secret',
  // The stub's chat app (subscribed_apps) = the API's: «افحص الخطوط» shows the chat webhook as ours.
  WA_CHAT_APP_ID: 'e2e-chat-app',
};
/** E2E_LINES=single = the production default (no WA_CHAT_* keys): the CI job «e2e (single line)». */
const E2E_WA_CHAT = process.env['E2E_LINES'] === 'single' ? {} : E2E_WA_CHAT_KEYS;

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
        WA_WABA_ID: E2E_WA.WA_WABA_ID,
        WA_APP_ID: E2E_WA.WA_APP_ID,
        ...E2E_WA_CHAT,
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
        ...E2E_WA_CHAT,
        // Set explicitly so a developer shell or .env cannot restrict recipients or stop the sync.
        WA_ALLOWED_RECIPIENTS: '',
        WA_TEMPLATE_SYNC: 'true',
        MESSAGING_ENABLED: 'true',
        // One-second sender tick: specs that wait for a send wait ~1 s, not up to 30 s.
        MESSAGE_SENDER_POLL_MS: '1000',
        // Specs write settings rows with SQL (support/messages.ts setSetting): read them fresh every time.
        SETTINGS_CACHE_MS: '0',
      },
      reuseExistingServer: !process.env['CI'],
      // The API's own log (sender passes, job errors) in the CI output, next to the failing spec.
      stdout: process.env['CI'] ? 'pipe' : 'ignore',
    },
    {
      command: `pnpm exec vite --port ${WEB_PORT} --strictPort`,
      cwd: '../apps/web',
      url: WEB_URL,
      // The open inbox refreshes every second (10 s in the app): a status chip shows without a 10 s wait.
      env: { VITE_API_URL: `http://localhost:${API_PORT}`, VITE_INBOX_REFRESH_MS: '1000' },
      reuseExistingServer: !process.env['CI'],
    },
  ],
});
