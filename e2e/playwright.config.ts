import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

// Written by `pnpm env:local` (local) or the CI step after `supabase start`.
if (existsSync('.env')) process.loadEnvFile('.env');

// Dedicated ports so e2e never talks to a dev server (or anything else) on 3000/5173.
const API_PORT = 3100;
const WEB_PORT = 5180;
const WEB_URL = `http://localhost:${WEB_PORT}`;

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
      command: 'node --env-file-if-exists=.env dist/main.js',
      cwd: '../apps/api',
      url: `http://localhost:${API_PORT}/health`,
      env: { PORT: String(API_PORT), WEB_ORIGIN: WEB_URL },
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
