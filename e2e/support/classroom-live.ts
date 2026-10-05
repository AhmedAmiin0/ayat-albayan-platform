import type { Browser, BrowserContextOptions, Locator, Page } from '@playwright/test';
import { ar, expect } from './fixtures';
import { authFile, USERS } from './users';

// The live classroom against a real LiveKit (`livekit-server --dev`), see tests/classroom-live.spec.ts.

export const LIVE = Boolean(process.env['LIVEKIT_URL']);
const SHOTS = process.env['CLASSROOM_SHOTS'] ?? 'test-results/classroom-shots';
export const BOARD = ar.classroom.board;
const MEDIA: BrowserContextOptions = { locale: 'ar', permissions: ['camera', 'microphone'] };

/** Chromium's fake camera / mic and an auto-picked screen for getDisplayMedia (headless capture). */
export const MEDIA_FLAGS = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--auto-select-desktop-capture-source=Entire screen'];

/** A fresh page with camera and mic allowed: signed in as `role`, or a visitor (null). */
export async function roomPage(browser: Browser, role: keyof typeof USERS | null, extra: BrowserContextOptions = {}): Promise<Page> {
  const ctx = await browser.newContext({ ...MEDIA, ...(role && { storageState: authFile(role) }), ...extra });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`[${role ?? 'guest'} pageerror]`, e.message));
  return page;
}

export const shot = (page: Page, name: string) => page.screenshot({ path: `${SHOTS}/classroom-${name}.png` });

/** «اجتماع داخلي» made by the admin: its shared link (/m/<token>). */
export async function newMeeting(admin: Page, title: string): Promise<string> {
  const L = ar.meetings.internal;
  await admin.goto('/admin/classrooms');
  await admin.getByText(ar.meetings.new).click();
  await admin.getByRole('button', { name: L.item }).click();
  const dialog = admin.getByRole('dialog', { name: L.dialogTitle });
  await dialog.getByLabel(L.title).fill(title);
  await dialog.getByRole('button', { name: L.create }).click();
  const link = new URL(await dialog.getByLabel(L.link).inputValue()).pathname;
  await dialog.getByRole('button', { name: L.enter }).click();
  await admin.waitForURL(/\/meeting\/[0-9a-f-]{36}$/);
  return link;
}

/** In the room, connected, with `n` people (never stuck on «جارٍ إدخالك» / «جارٍ إعادة الاتصال»). */
export async function expectConnected(page: Page, n: number): Promise<void> {
  await expect(page.getByText(ar.classroom.error.classroom_not_configured)).toHaveCount(0);
  await expect(page.getByText(ar.classroom.participants.replace('{n}', String(n)))).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(ar.classroom.joining)).toHaveCount(0);
  await expect(page.getByText(ar.classroom.reconnecting)).toHaveCount(0);
}

// The e2e tsconfig has no DOM lib: the slices of the DOM read inside the page.
interface CanvasLike {
  width: number;
  height: number;
  getContext(kind: '2d'): { getImageData(x: number, y: number, w: number, h: number): { data: ArrayLike<number> } } | null;
}

/** Decoded width of the <video> in `tile` (0 until frames arrive). */
export const videoWidth = (tile: Locator): Promise<number> =>
  tile.locator('video').first().evaluate((v) => (v as unknown as { videoWidth: number }).videoWidth);

/** The page's scroll width (no sideways scroll on a phone). */
export const pageScrollWidth = (page: Page): Promise<number> =>
  page.evaluate(() => (globalThis as unknown as { document: { documentElement: { scrollWidth: number } } }).document.documentElement.scrollWidth);

/** The board canvas' inked pixels (anything not fully transparent or white). */
export function boardInk(page: Page): Promise<number> {
  return page.getByRole('img', { name: BOARD.title }).evaluate((el) => {
    const c = el as unknown as CanvasLike;
    const data = c.getContext('2d')?.getImageData(0, 0, c.width, c.height).data ?? [];
    let n = 0;
    for (let i = 0; i < data.length; i += 4) if ((data[i + 3] ?? 0) > 0 && (data[i] ?? 255) < 128) n += 1;
    return n;
  });
}

/** A mouse stroke across the board. */
export async function drawStroke(page: Page): Promise<void> {
  const box = await page.getByRole('img', { name: BOARD.title }).boundingBox();
  if (!box) throw new Error('no board');
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.3);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6, { steps: 12 });
  await page.mouse.up();
}

/** A finger stroke (CDP touch events → pointerType touch), as on a phone. */
export async function touchStroke(page: Page): Promise<void> {
  const box = await page.getByRole('img', { name: BOARD.title }).boundingBox();
  if (!box) throw new Error('no board');
  const cdp = await page.context().newCDPSession(page);
  const at = (f: number) => [{ x: box.x + box.width * (0.2 + f * 0.5), y: box.y + box.height * (0.3 + f * 0.4) }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(0) });
  for (let i = 1; i <= 10; i += 1) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(i / 10) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
