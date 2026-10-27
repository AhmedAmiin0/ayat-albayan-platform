import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PdfRenderer } from './pdf-renderer';

// e-lazy-4: playwright-core (≈ 250 ms and ≈ 80 MB to load) is required on the first report PDF,
// not at API boot. The browser behaviour stays as it was: one browser reused across renders, a
// fresh context per report, and a failed launch retried on the next render.

const loaded = vi.hoisted(() => ({ count: 0 }));
const launch = vi.hoisted(() => vi.fn());

vi.mock('playwright-core', () => {
  loaded.count += 1;
  return { chromium: { launch } };
});

function fakeBrowser() {
  const page = { setContent: vi.fn(), evaluate: vi.fn(), pdf: vi.fn(async () => new Uint8Array([37, 80, 68, 70])) };
  const context = { newPage: vi.fn(async () => page), close: vi.fn(async () => undefined) };
  return { newContext: vi.fn(async () => context), on: vi.fn(), close: vi.fn(async () => undefined), context };
}

describe('PdfRenderer loads Chromium on the first report', () => {
  beforeEach(() => launch.mockReset());

  it('importing and creating the renderer loads nothing; the first render loads it once and reuses the browser', async () => {
    const renderer = new PdfRenderer();
    expect(loaded.count).toBe(0);
    const browser = fakeBrowser();
    launch.mockResolvedValue(browser);
    await renderer.render('<p>1</p>');
    await renderer.render('<p>2</p>');
    expect(loaded.count).toBe(1);
    expect(launch).toHaveBeenCalledTimes(1);
    expect(launch).toHaveBeenCalledWith({ headless: true });
    expect(browser.newContext).toHaveBeenCalledTimes(2);
    expect(browser.context.close).toHaveBeenCalledTimes(2);
    await renderer.close();
    expect(browser.close).toHaveBeenCalledTimes(1);
  });

  it('a failed launch is retried on the next render', async () => {
    const renderer = new PdfRenderer();
    launch.mockRejectedValueOnce(new Error('no browser')).mockResolvedValueOnce(fakeBrowser());
    await expect(renderer.render('<p>1</p>')).rejects.toThrow('no browser');
    await expect(renderer.render('<p>2</p>')).resolves.toBeInstanceOf(Uint8Array);
    expect(launch).toHaveBeenCalledTimes(2);
  });
});
