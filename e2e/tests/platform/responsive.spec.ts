import type { Page } from '@playwright/test';
import { ar, expect, test } from '../../support/core/fixtures';
import { restingBox } from '../../support/finance/settle';
import { AR_LOCALE } from '../../support/core/locale';
import { gotoLoaded } from '../../support/core/page-loaded';
import { seedResponsiveScene } from '../../support/platform/responsive-scene';
import type { ResponsiveScene } from '../../support/platform/responsive-scene.types';

// Responsive guard: the main screens never scroll
// sideways on a phone (390px) or a tablet (768px), in RTL. Tables and tab strips scroll inside
// their own boxes; the page itself must not. Runs once (desktop project), sizing its own viewport.
// One test per page: a full load of the dev build is ~2,000 module requests (3-5 s, 2-3x that on
// a slow runner), so 22 loads in one test ran past any fixed budget.

const HEIGHT = 844;
const ADMIN_PAGES = [
  '/admin',
  '/admin/schedule',
  '/admin/students',
  '/admin/students/:student',
  '/admin/classrooms',
  '/admin/subscriptions',
  '/admin/settings',
  // The settings hub's five pages (docs/26b §1).
  '/admin/settings/values',
  '/admin/settings/communications',
  // The safety tab (docs/23 phase 6) now holds the guards and Kapso.
  '/admin/settings/communications?tab=safety',
  '/admin/settings/integrations',
  '/admin/settings/google',
  '/admin/settings/appearance',
  '/admin/book',
] as const;
const PUBLIC_PAGES = [':link', '/join/abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ', '/login'] as const;

/** How far the document is wider than the viewport (0 = no horizontal overflow). */
const overflow = (page: Page) =>
  page.evaluate<number>('document.scrollingElement.scrollWidth - window.innerWidth');

const pathIn = (path: string, scene: ResponsiveScene) =>
  path.replace(':student', scene.studentId).replace(':link', scene.studentLink);

for (const width of [390, 768]) {
  test.describe(`no horizontal overflow at ${width}px`, () => {
    let scene: ResponsiveScene;
    test.beforeAll(async ({ browser }) => {
      test.skip(test.info().project.name !== 'desktop', 'sizes its own viewport; once is enough');
      scene = await seedResponsiveScene(browser);
    });
    const open = async (page: Page, path: string) => {
      await page.setViewportSize({ width, height: HEIGHT });
      await gotoLoaded(page, pathIn(path, scene));
      return page;
    };

    for (const path of ADMIN_PAGES) {
      test(`admin ${path}`, async ({ asRole }) => {
        const admin = await open(await asRole('admin'), path);
        expect(await overflow(admin), `${path} @${width}px`).toBeLessThanOrEqual(0);
      });
    }

    test('admin inbox with a conversation and its lead panel open', async ({ asRole }) => {
      const admin = await open(await asRole('admin'), '/admin/inbox');
      const thread = ar.inbox.openThread.replace('{name}', scene.guardian);
      await admin.getByRole('link', { name: thread }).click();
      await expect(admin.getByRole('log', { name: ar.messages.log })).toBeVisible();
      expect(await overflow(admin), `inbox thread @${width}px`).toBeLessThanOrEqual(0);
    });

    test('a dialog never runs off the screen: its body scrolls inside the panel', async ({ asRole }) => {
      const admin = await open(await asRole('admin'), '/admin/students/:student');
      await admin.getByRole('button', { name: ar.subscriptions.new }).first().click();
      const dialog = admin.getByRole('dialog', { name: ar.subscriptions.new });
      const box = await restingBox(dialog);
      // Polled: a slow runner can still be easing the sheet in (845.6 once on CI, at rest 844).
      const bottom = async () => {
        const b = await dialog.boundingBox();
        return (b?.y ?? 0) + (b?.height ?? 0);
      };
      const atBottom = { message: `dialog bottom @${width}px` };
      await expect.soft.poll(bottom, atBottom).toBeLessThanOrEqual(HEIGHT + 0.5);
      const right = (box?.x ?? 0) + (box?.width ?? 0);
      expect.soft(right, `dialog right @${width}px`).toBeLessThanOrEqual(width);
    });

    test('teacher /teacher', async ({ asRole }) => {
      const teacher = await open(await asRole('teacher'), '/teacher');
      expect(await overflow(teacher), `/teacher @${width}px`).toBeLessThanOrEqual(0);
    });

    for (const path of PUBLIC_PAGES) {
      test(`public ${path}`, async ({ browser }) => {
        const context = await browser.newContext({ locale: AR_LOCALE });
        try {
          const guest = await open(await context.newPage(), path);
          expect(await overflow(guest), `${path} @${width}px`).toBeLessThanOrEqual(0);
        } finally {
          await context.close();
        }
      });
    }
  });
}
