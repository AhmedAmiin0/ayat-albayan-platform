import type { Page } from '@playwright/test';
import { ar, expect, test } from '../support/fixtures';
import { resetAbrar, seedFamily } from '../support/schedule';
import { stubInbound, stubReset } from '../support/wa-stub';

// Owner, 2026-10-05: "give the layout of the conversations a max height and make the tables inside
// scrollable, don't make the page scroll" + "make tables have a static height". The admin frame is
// viewport-high: the browser page never scrolls; the inbox columns and the table boxes do.

/** The browser page's own vertical overflow (0 = it cannot scroll). */
const pageOverflow = (page: Page) =>
  page.evaluate<number>('document.scrollingElement.scrollHeight - window.innerHeight');

test.describe('viewport-high admin frame', () => {
  test('a long conversation: the page never scrolls, the log does, the reply box stays in view', async ({ asRole }) => {
    test.skip(test.info().project.name !== 'desktop', 'sizes its own viewport');
    test.setTimeout(180_000);
    await stubReset();
    await resetAbrar();
    const digits = `9665${String(Date.now()).slice(-8)}`;
    const guardian = `أم هند ${digits.slice(-4)}`;
    for (let i = 1; i <= 30; i += 1) {
      await stubInbound({ from: digits, name: guardian, text: `رسالة رقم ${i}: السلام عليكم، أريد الاستفسار عن مواعيد الحلقات المسائية` });
    }
    const admin = await asRole('admin');
    for (const [width, height] of [[1280, 800], [390, 844]] as const) {
      await admin.setViewportSize({ width, height });
      await admin.goto('/admin/inbox');
      await admin.getByRole('link', { name: ar.inbox.openThread.replace('{name}', guardian) }).click({ timeout: 30_000 });
      const log = admin.getByRole('log', { name: ar.messages.log });
      await expect(log.getByText('رسالة رقم 30', { exact: false })).toBeVisible();
      await admin.waitForTimeout(300);
      expect(await pageOverflow(admin), `inbox @${width}`).toBeLessThanOrEqual(0);
      if (width === 1280) {
        // The log's own box scrolls; the reply box is on screen without scrolling anything.
        const scrolls = await log.evaluate((el) => {
          const box = el.parentElement;
          return !!box && box.scrollHeight > box.clientHeight;
        });
        expect(scrolls).toBe(true);
        await expect(admin.getByRole('textbox').last()).toBeInViewport();
      }
    }
  });

  test('a list table keeps a fixed height inside the frame, few rows or many', async ({ asRole }) => {
    test.skip(test.info().project.name !== 'desktop', 'sizes its own viewport');
    await seedFamily('أم سلمى', ['سلمى']);
    const admin = await asRole('admin');
    await admin.setViewportSize({ width: 1280, height: 800 });
    await admin.goto('/admin/students');
    const box = admin.locator('[data-table-box]').first();
    await expect(box).toBeVisible();
    const rect = await box.boundingBox();
    expect(rect?.height ?? 0).toBeGreaterThanOrEqual(320);
    // It reaches down the frame (not just the height of its rows) and stays on screen.
    expect((rect?.y ?? 0) + (rect?.height ?? 0)).toBeGreaterThan(560);
    expect((rect?.y ?? 0) + (rect?.height ?? 0)).toBeLessThanOrEqual(800);
    expect(await pageOverflow(admin)).toBeLessThanOrEqual(0);
  });
});
