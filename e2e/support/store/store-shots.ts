import { expect, type Browser, type Page } from '@playwright/test';
import { join } from 'node:path';
import { AR_LOCALE } from '../core/locale';
import type { Shot } from './store.types';

// Google Play phone screenshots: 9:16 at 1080 x 1920 (a 360 x 640 phone at 3x), the viewport
// only, never the full page.

const SHOT_SIZE = { width: 1080, height: 1920 } as const;
const OUT_DIR = join(import.meta.dirname, '..', '..', 'store-shots');

/** A phone context on a frozen clock: the countdown and «today» read the same in every shot. */
export async function storePage(browser: Browser, frozenAt: Date): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width: 360, height: 640 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: AR_LOCALE,
    timezoneId: 'Asia/Riyadh',
    colorScheme: 'light',
  });
  const page = await context.newPage();
  await page.clock.setFixedTime(frozenAt);
  return page;
}

/** The theme the boot script reads from the system: dark from the next load on. */
export async function toDark(page: Page): Promise<void> {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
}

/** Width and height from the PNG's IHDR chunk (bytes 16-23, big-endian). */
function pngSize(png: Buffer): { width: number; height: number } {
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

/** A page wider than the phone makes mobile Chromium zoom the whole page out (shot at 1/3). */
async function fitsWidth(page: Page): Promise<void> {
  const overflow = await page.evaluate<number>(
    'document.documentElement.scrollWidth - document.documentElement.clientWidth',
  );
  expect(overflow, 'the page is no wider than the phone').toBeLessThanOrEqual(0);
}

/**
 * Network idle, every web font in, no skeleton left, nothing wider than the phone; then the PNG,
 * checked for its size.
 */
export async function shoot(page: Page, name: Shot): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForFunction('document.fonts.status === "loaded"');
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await fitsWidth(page);
  await page.mouse.move(0, 0);
  const png = await page.screenshot({
    path: join(OUT_DIR, `${name}.png`),
    animations: 'disabled',
    caret: 'hide',
    fullPage: false,
  });
  expect(pngSize(png)).toEqual(SHOT_SIZE);
}
