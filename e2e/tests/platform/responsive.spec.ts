import type { Page } from '@playwright/test';
import { ar, expect, test } from '../../support/core/fixtures';
import { resetAbrar, seedFamily, seedLesson } from '../../support/core/schedule';
import { restingBox } from '../../support/finance/settle';
import { stubInbound, stubReset } from '../../support/wa-stub';
import { AR_LOCALE } from '../../support/core/locale';

// Responsive guard (owner, 2026-10-05: "fix the responsive issues"): the main screens never scroll
// sideways on a phone (390px) or a tablet (768px), in RTL. Tables and tab strips scroll inside
// their own boxes; the page itself must not. Runs once (desktop project), sizing its own viewport.

/** How far the document is wider than the viewport (0 = no horizontal overflow). */
const overflow = (page: Page) =>
  page.evaluate<number>('document.scrollingElement.scrollWidth - window.innerWidth');

async function settle(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

test.describe('no horizontal overflow on the main screens', () => {
  test('admin, teacher and public pages at 390px and 768px', async ({ asRole, browser }) => {
    test.skip(test.info().project.name !== 'desktop', 'sizes its own viewport; once is enough');
    test.setTimeout(240_000);
    await stubReset();
    const teacherId = await resetAbrar();
    const family = await seedFamily('أم سارة عبد الرحمن الطويلة', ['سارة عبد الرحمن', 'يوسف']);
    const studentId = family.studentIds[0] ?? '';
    await seedLesson({ teacherId, studentId, startsAt: new Date(Date.now() + 3_600_000), minutes: 30 });
    const digits = `9665${String(Date.now()).slice(-8)}`;
    const guardian = `أم مريم ${digits.slice(-4)}`;
    await stubInbound({ from: digits, name: guardian, text: 'السلام عليكم، أريد الاشتراك لابنتي في حلقات الحفظ' });

    const admin = await asRole('admin');
    await settle(admin, `/admin/students/${studentId}`);
    await admin.getByRole('button', { name: ar.studentLink.create }).click();
    const studentLink = new URL(await admin.getByLabel(ar.studentLink.shown).inputValue()).pathname;
    const teacher = await asRole('teacher');
    const guest = await (await browser.newContext({ locale: AR_LOCALE })).newPage();

    const adminPaths = [
      '/admin',
      '/admin/schedule',
      '/admin/students',
      `/admin/students/${studentId}`,
      '/admin/classrooms',
      '/admin/subscriptions',
      '/admin/settings',
      // The settings hub's five pages (docs/26b §1).
      '/admin/settings/values',
      '/admin/settings/communications',
      // «التواصل»'s safety tab (docs/23 phase 6): the guards and Kapso moved here from «التكاملات».
      '/admin/settings/communications?tab=safety',
      '/admin/settings/integrations',
      '/admin/settings/google',
      '/admin/settings/appearance',
      '/admin/book',
    ];
    for (const width of [390, 768]) {
      for (const page of [admin, teacher, guest]) await page.setViewportSize({ width, height: 844 });
      for (const path of adminPaths) {
        await settle(admin, path);
        expect.soft(await overflow(admin), `${path} @${width}px`).toBeLessThanOrEqual(0);
      }
      // The inbox with a conversation and its lead panel open.
      await settle(admin, '/admin/inbox');
      await admin.getByRole('link', { name: ar.inbox.openThread.replace('{name}', guardian) }).click();
      await expect(admin.getByRole('log', { name: ar.messages.log })).toBeVisible();
      expect.soft(await overflow(admin), `inbox thread @${width}px`).toBeLessThanOrEqual(0);
      // A dialog never runs off the screen: its body scrolls inside the panel.
      await settle(admin, `/admin/students/${studentId}`);
      await admin.getByRole('button', { name: ar.subscriptions.new }).first().click();
      const dialog = admin.getByRole('dialog', { name: ar.subscriptions.new });
      const box = await restingBox(dialog);
      // Polled: a slow runner can still be easing the sheet in (845.6 once on CI, at rest 844).
      const bottom = async () => {
        const b = await dialog.boundingBox();
        return (b?.y ?? 0) + (b?.height ?? 0);
      };
      await expect.soft.poll(bottom, { message: `dialog bottom @${width}px` }).toBeLessThanOrEqual(844.5);
      expect.soft((box?.x ?? 0) + (box?.width ?? 0), `dialog right @${width}px`).toBeLessThanOrEqual(width);

      await settle(teacher, '/teacher');
      expect.soft(await overflow(teacher), `/teacher @${width}px`).toBeLessThanOrEqual(0);
      for (const path of [studentLink, '/join/abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ', '/login']) {
        await settle(guest, path);
        expect.soft(await overflow(guest), `${path} @${width}px`).toBeLessThanOrEqual(0);
      }
    }
  });
});
