// pnpm --filter e2e screens --base http://localhost:5205 --out <dir> [--routes /login,/admin] [--user teacher]
// Visual check, not a test: logs in through the UI as a seeded e2e user (admin) and saves full-page
// PNGs per route in three variants: desktop-light, desktop-dark (data-theme) and mobile 390px.
// Route tokens `student:first` / `teacher:first` open the first row of that list.
// Needs the e2e users (created by the e2e global setup) and ideally `pnpm seed:demo`.
import { chromium, type Browser, type BrowserContextOptions, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import ar from '@ab/shared/i18n/ar.json' with { type: 'json' };
import { USERS } from '../support/users.ts';

const DEFAULT_ROUTES = [
  '/login',
  '/admin/students',
  'student:first',
  '/admin/teachers',
  'teacher:first',
  '/admin/leads',
  '/admin/job-applicants',
];
const VARIANTS = [
  { name: 'desktop-light', theme: 'light', viewport: { width: 1440, height: 900 } },
  { name: 'desktop-dark', theme: 'dark', viewport: { width: 1440, height: 900 } },
  { name: 'mobile-light', theme: 'light', viewport: { width: 390, height: 844 } },
] as const;
type Variant = (typeof VARIANTS)[number];
type Role = keyof typeof USERS;
type Run = { browser: Browser; base: string; out: string; role: Role };

function slug(route: string): string {
  return route.replace(/^\//, '').replace(/[/:]/g, '-') || 'home';
}

async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForFunction('document.fonts.status === "loaded"'); // Noto Sans Arabic, not fallbacks
}

async function newPage(run: Run, opts: { variant: Variant; state?: BrowserContextOptions['storageState'] }) {
  const context = await run.browser.newContext({ viewport: opts.variant.viewport, locale: 'ar', storageState: opts.state });
  await context.addInitScript((theme) => localStorage.setItem('ayat-theme', theme), opts.variant.theme);
  return context.newPage();
}

async function login(run: Run): Promise<BrowserContextOptions['storageState']> {
  const page = await newPage(run, { variant: VARIANTS[0] });
  await page.goto(`${run.base}/login`);
  await page.getByLabel(ar.auth.email).fill(USERS[run.role].email);
  await page.getByLabel(ar.auth.password).fill(USERS[run.role].password);
  await page.getByRole('button', { name: ar.auth.submit }).click();
  await page.waitForURL(`**/${run.role}`);
  const state = await page.context().storageState();
  await page.context().close();
  return state;
}

/** `student:first` → the URL of the first row in /admin/students (same for teachers). */
async function resolveRoute(run: Run, opts: { route: string; page: Page }): Promise<string> {
  const match = /^(student|teacher):first$/.exec(opts.route);
  if (!match) return opts.route;
  await opts.page.goto(`${run.base}/admin/${match[1]}s`);
  await settle(opts.page); // the first body row is «جاري التحميل…» until the list arrives
  await opts.page.getByRole('row').nth(1).click();
  await opts.page.waitForURL(new RegExp(`/admin/${match[1]}s/[^/]+$`));
  return new URL(opts.page.url()).pathname;
}

type Shot = { path: string; name: string };

async function shoot(run: Run, opts: { variant: Variant; shots: Shot[]; state: BrowserContextOptions['storageState'] }) {
  for (const shot of opts.shots) {
    const signedOut = shot.path === '/login';
    const page = await newPage(run, { variant: opts.variant, state: signedOut ? undefined : opts.state });
    await page.goto(`${run.base}${shot.path}`);
    await settle(page);
    const file = join(run.out, `${opts.variant.name}-${shot.name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(file);
    await page.context().close();
  }
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      base: { type: 'string', default: 'http://localhost:5173' },
      out: { type: 'string', default: 'screens' },
      routes: { type: 'string' },
      user: { type: 'string', default: 'admin' },
    },
  });
  const role = Object.keys(USERS).find((r): r is Role => r === values.user);
  if (!role) throw new Error(`--user must be one of ${Object.keys(USERS).join(', ')}`);
  const run: Run = { browser: await chromium.launch(), base: values.base.replace(/\/$/, ''), out: values.out, role };
  mkdirSync(run.out, { recursive: true });
  try {
    const state = await login(run);
    const helper = await newPage(run, { variant: VARIANTS[0], state });
    const shots: Shot[] = [];
    for (const route of (values.routes?.split(',') ?? DEFAULT_ROUTES).map((r) => r.trim())) {
      shots.push({ path: await resolveRoute(run, { route, page: helper }), name: slug(route) });
    }
    await helper.context().close();
    for (const variant of VARIANTS) await shoot(run, { variant, shots, state });
  } finally {
    await run.browser.close();
  }
}

await main();
