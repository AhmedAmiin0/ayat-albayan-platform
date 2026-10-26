import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import type { Browser } from 'playwright-core';
import { footerTemplate, pageCount } from './pdf-pages';

const A4 = { format: 'A4', printBackground: true, preferCSSPageSize: true } as const;

/** playwright-core (≈ 250 ms and ≈ 80 MB to load) is required on the first report, not at boot. */
async function launchChromium(): Promise<Browser> {
  const { chromium } = await import('playwright-core');
  return chromium.launch({ headless: true });
}

/**
 * HTML → A4 PDF with headless Chromium (docs/07 §13). playwright-core is pinned to the version
 * whose browser the e2e suite installs; the Docker image installs the same build
 * (PLAYWRIGHT_BROWSERS_PATH). One browser per job tick, a fresh context per report.
 */
@Injectable()
export class PdfRenderer implements OnModuleDestroy {
  private browser: Promise<Browser> | null = null;

  /**
   * One A4 page as designed; a report that runs longer is printed again with `footer` (ASCII,
   * footerLabel) and «n / total» on every page (pdf-pages.ts).
   */
  async render(html: string, footer?: string): Promise<Uint8Array> {
    const browser = await this.open();
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      // Never print with a fallback font: the faces are font-display:block data URIs.
      await page.evaluate('document.fonts.ready.then(() => true)');
      const pdf = await page.pdf(A4);
      if (!footer || pageCount(pdf) <= 1) return pdf;
      return await page.pdf({
        ...A4,
        displayHeaderFooter: true,
        headerTemplate: '<span></span>',
        footerTemplate: footerTemplate(footer),
      });
    } finally {
      await context.close();
    }
  }

  /** Frees the browser between ticks (a few reports a day do not need it resident). */
  async close(): Promise<void> {
    const pending = this.browser;
    this.browser = null;
    if (!pending) return;
    const browser = await pending.catch(() => null);
    await browser?.close().catch(() => undefined);
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }

  private open(): Promise<Browser> {
    if (!this.browser) {
      const launching = launchChromium().then((b) => {
        b.on('disconnected', () => {
          if (this.browser === launching) this.browser = null;
        });
        return b;
      });
      launching.catch(() => {
        if (this.browser === launching) this.browser = null;
      });
      this.browser = launching;
    }
    return this.browser;
  }
}
