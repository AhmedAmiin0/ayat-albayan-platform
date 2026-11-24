import type { Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { AR_LOCALE } from '../core/locale';
import { OUT_DIR } from './plan.ts';
import { shotFile } from './naming.ts';
import type { IndexEntry, Job, Variant } from './screens.types.ts';

/** One context per variant: its viewport, and the theme the boot script reads before paint. */
export async function variantPage(job: Job, variant: Variant): Promise<Page> {
  const context = await job.browser.newContext({
    viewport: { width: variant.width, height: variant.height },
    locale: AR_LOCALE,
    timezoneId: 'Asia/Riyadh',
    colorScheme: variant.theme,
    storageState: job.state,
  });
  await context.addInitScript((theme) => {
    localStorage.setItem('ayat-theme', theme);
  }, variant.theme);
  return context.newPage();
}

/**
 * Loaded, fonts in and no skeleton left. Pages that poll never go network-idle: the wait is
 * bounded and the shot is taken as the page stands.
 */
export async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('load');
  await page.waitForLoadState('networkidle', { timeout: 6_000 }).catch(() => undefined);
  await page.waitForFunction('document.fonts.status === "loaded"', null, { timeout: 10_000 });
  await page
    .locator('[aria-busy="true"]')
    .first()
    .waitFor({ state: 'detached', timeout: 8_000 })
    .catch(() => undefined);
  await page.mouse.move(0, 0);
}

/** Where the page ended up, without a trailing slash: a guard's redirect shows here. */
export function landedOn(page: Page): string {
  const path = new URL(page.url()).pathname;
  return path.length > 1 ? path.replace(/\/$/, '') : path;
}

export async function save(
  job: Job,
  shot: { page: Page; entry: Omit<IndexEntry, 'file'> },
): Promise<IndexEntry> {
  const { entry } = shot;
  const file = shotFile({ ...entry, app: job.app, role: job.role, route: entry.url });
  const path = join(OUT_DIR, file);
  mkdirSync(dirname(path), { recursive: true });
  await shot.page.screenshot({ path, fullPage: true, animations: 'disabled', caret: 'hide' });
  const saved = { ...entry, file };
  job.entries.push(saved);
  return saved;
}

export async function saveDialog(job: Job, shot: { page: Page; entry: IndexEntry; n: number }) {
  const { entry } = shot;
  const file = shotFile({ ...entry, route: entry.url, dialog: shot.n });
  const path = join(OUT_DIR, file);
  mkdirSync(dirname(path), { recursive: true });
  await shot.page.screenshot({ path, fullPage: false, animations: 'disabled', caret: 'hide' });
  job.entries.push({ ...entry, file });
}
