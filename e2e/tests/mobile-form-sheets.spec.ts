import type { Locator } from '@playwright/test';
import { ar, expect, test } from '../support/fixtures';
import { stubInbound, stubReset } from '../support/wa-stub';

// Owner, 2026-10-05: "on the mobile view of the dashboard don't make the bars for the forms; keep
// them all as full-screen modals". On a phone (390×844) a form dialog fills the screen and its
// primary button is on screen without scrolling; from 640px the dialog stays the floating card.

const PHONE = { width: 390, height: 844 } as const;

// Waits out the entrance (fade-up on phones, pop-in from 640px) so a box is read at rest. A string
// (the e2e tsconfig has no DOM lib); infinite animations (skeleton shimmer) are skipped.
const SETTLE =
  '(el) => Promise.all(el.getAnimations({ subtree: true })' +
  '.filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished)).then(() => null)';
const settled = (dialog: Locator) => dialog.evaluate(SETTLE);

async function expectFullScreen(dialog: Locator): Promise<void> {
  await expect(dialog).toBeVisible();
  await settled(dialog);
  const box = await dialog.boundingBox();
  expect(box?.x ?? -1).toBeLessThanOrEqual(1);
  expect(box?.y ?? -1).toBeLessThanOrEqual(1);
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(PHONE.width - 2);
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(PHONE.height - 2);
}

test.describe('forms on a phone open as full-screen sheets', () => {
  test('«إضافة مصروف»: the dialog fills the viewport, «حفظ» in view at the bottom', async ({ asRole }) => {
    test.skip(test.info().project.name !== 'desktop', 'sizes its own viewport');
    const page = await asRole('admin');
    await page.setViewportSize(PHONE);
    await page.goto('/admin/expenses');
    await page.getByRole('button', { name: ar.expenses.add }).click();
    const dialog = page.getByRole('dialog', { name: ar.expenses.add });
    await expectFullScreen(dialog);
    const save = dialog.getByRole('button', { name: ar.common.save });
    await expect(save).toBeInViewport({ ratio: 1 });
    const saveBox = await save.boundingBox();
    expect((saveBox?.y ?? 0) + (saveBox?.height ?? 0)).toBeGreaterThan(PHONE.height / 2);
    await expect(dialog.getByRole('button', { name: ar.common.close })).toBeInViewport({ ratio: 1 });

    // From 640px the same dialog is the floating card again.
    await page.setViewportSize({ width: 1024, height: 768 });
    await settled(dialog);
    const card = await dialog.boundingBox();
    expect(card?.width ?? 0).toBeLessThan(1024);
    expect(card?.height ?? 0).toBeLessThan(768);
  });

  test('inbox: the lead panel is a header button that opens a full-screen sheet', async ({ asRole }) => {
    test.skip(test.info().project.name !== 'desktop', 'sizes its own viewport');
    await stubReset();
    const digits = `9665${String(Date.now()).slice(-8)}`;
    const name = `أم ليان ${digits.slice(-4)}`;
    await stubInbound({ from: digits, name, text: 'السلام عليكم، أريد التسجيل لابنتي' });
    const page = await asRole('admin');
    await page.setViewportSize(PHONE);
    await page.goto('/admin/inbox');
    await page.getByRole('link', { name: ar.inbox.openThread.replace('{name}', name) }).click({ timeout: 30_000 });
    await expect(page.getByRole('complementary', { name: ar.inbox.leadPanel })).toHaveCount(0);
    await page.getByRole('button', { name: ar.inbox.leadSheet }).click();
    const sheet = page.getByRole('dialog', { name: ar.inbox.leadSheet });
    await expectFullScreen(sheet);
    await expect(sheet.getByRole('button', { name: ar.inbox.registerStudent })).toBeVisible();
  });
});
