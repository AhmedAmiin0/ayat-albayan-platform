import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { afterAll, describe, expect, it } from 'vitest';
import { pdfAssets } from './pdf-assets';
import { PdfRenderer } from './pdf-renderer';
import { absentModel, sampleModel } from './report-pdf.fakes';
import { reportHtml } from './template';

// Real Chromium, so it runs only where the Playwright browser is installed (dev machines with the
// e2e browsers, the API image). PDF_SAMPLE_OUT=<dir> also writes sample.pdf and a PNG to look at.
const hasChromium = existsSync(chromium.executablePath());
const out = process.env.PDF_SAMPLE_OUT;

/** Page objects in the PDF (not the /Pages tree). */
function pageCount(pdf: Uint8Array): number {
  return Buffer.from(pdf).toString('latin1').match(/\/Type\s*\/Page(?!s)/g)?.length ?? 0;
}

describe.skipIf(!hasChromium)('PdfRenderer — Chromium smoke (R-REP-03)', () => {
  const renderer = new PdfRenderer();
  afterAll(() => renderer.close());

  it('renders the attended sample as one A4 page with the fonts embedded', async () => {
    const pdf = await renderer.render(reportHtml(sampleModel(), pdfAssets()));
    if (out) {
      mkdirSync(out, { recursive: true });
      writeFileSync(join(out, 'sample.pdf'), pdf);
    }
    const raw = Buffer.from(pdf).toString('latin1');
    expect(raw.startsWith('%PDF-')).toBe(true);
    expect(pdf.byteLength).toBeGreaterThan(20_000);
    expect(pageCount(pdf)).toBe(1);
    // Text stays text (docs/07 §13): the subset fonts are embedded, nothing is rasterised.
    expect(raw).toMatch(/\/FontFile2|\/FontFile3|\/FontFile\b/);
    expect(raw).toMatch(/Amiri/);
    expect(raw).toMatch(/IBMPlexSansArabic/);
  }, 60_000);

  it('renders the absent sample as one page too, and reuses the browser', async () => {
    const pdf = await renderer.render(reportHtml(absentModel(), pdfAssets()));
    expect(pageCount(pdf)).toBe(1);
  }, 60_000);

  it.skipIf(!out)('writes a PNG of the page for a visual check', async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 718, height: 1047 }, deviceScaleFactor: 2 });
    await page.emulateMedia({ media: 'print' });
    await page.setContent(reportHtml(sampleModel(), pdfAssets()), { waitUntil: 'load' });
    await page.evaluate('document.fonts.ready.then(() => true)');
    await page.screenshot({ path: join(out ?? '.', 'sample.png'), fullPage: true });
    await page.setContent(reportHtml(absentModel(), pdfAssets()), { waitUntil: 'load' });
    await page.evaluate('document.fonts.ready.then(() => true)');
    await page.screenshot({ path: join(out ?? '.', 'sample-absent.png'), fullPage: true });
    await browser.close();
  }, 60_000);
});
