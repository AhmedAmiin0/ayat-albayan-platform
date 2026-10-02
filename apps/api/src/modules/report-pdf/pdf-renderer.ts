import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { chromium, type Browser } from 'playwright-core';

/**
 * HTML → A4 PDF with headless Chromium (docs/07 §13). playwright-core is pinned to the version
 * whose browser the e2e suite installs; the Docker image installs the same build
 * (PLAYWRIGHT_BROWSERS_PATH). One browser per job tick, a fresh context per report.
 */
@Injectable()
export class PdfRenderer implements OnModuleDestroy {
  private browser: Promise<Browser> | null = null;

  async render(html: string): Promise<Uint8Array> {
    const browser = await this.open();
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      // Never print with a fallback font: the faces are font-display:block data URIs.
      await page.evaluate('document.fonts.ready.then(() => true)');
      return await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
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
      const launching = chromium.launch({ headless: true }).then((b) => {
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
