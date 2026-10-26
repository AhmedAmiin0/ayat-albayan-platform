import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { afterAll, describe, expect, it } from 'vitest';
import { pdfAssets } from '../pdf-assets';
import { pageCount } from './pdf-pages';
import { PdfRenderer } from './pdf-renderer';
import { absentModel, sampleModel } from '../report-pdf.fakes';
import { reportHtml } from '../template/template';

// Real Chromium, so it runs only where the Playwright browser is installed (dev machines with the
// e2e browsers, the API image). PDF_SAMPLE_OUT=<dir> also writes sample.pdf and a PNG to look at.
const hasChromium = existsSync(chromium.executablePath());
const out = process.env.PDF_SAMPLE_OUT;


describe.skipIf(!hasChromium)('PdfRenderer — Chromium smoke (R-REP-03)', () => {
  const renderer = new PdfRenderer();
  // Chromium can take >10 s to exit while turbo runs every package in parallel.
  afterAll(() => renderer.close(), 30_000);

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

  it('a report too long for one page flows on and is printed with the footer on every page', async () => {
    const long = 'تحسّن واضح في المدود ومخارج الحروف، ومحتاجين نركّز على الإدغام بغنة. '.repeat(14);
    const html = reportHtml(sampleModel({ notes: long }), pdfAssets());
    const plain = await renderer.render(html);
    const footed = await renderer.render(html, 'AB-0183 | 2026-09-29');
    if (out) writeFileSync(join(out, 'sample-long.pdf'), footed);
    expect(pageCount(plain)).toBeGreaterThan(1);
    expect(pageCount(footed)).toBe(pageCount(plain));
    expect(footed).not.toEqual(plain);
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
