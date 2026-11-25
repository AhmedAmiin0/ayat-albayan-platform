import type { Locator } from '@playwright/test';
import { ar, expect, test } from '../../support/core/fixtures';
import { settled } from '../../support/finance/settle';
import { stubInbound, stubReset } from '../../support/core/wa-stub';

// On a phone a form dialog fills the screen; from 640px it is a full-height inline-end panel.

const PHONE = { width: 390, height: 844 } as const;


async function expectFullScreen(dialog: Locator): Promise<void> {
  await expect(dialog).toBeVisible();
  await settled(dialog);
  // Polled: on a slow runner the entrance can still be starting when the box is first read.
  await expect.poll(async () => (await dialog.boundingBox())?.y ?? -1).toBeLessThanOrEqual(1);
  const box = await dialog.boundingBox();
  expect(box?.x ?? -1).toBeLessThanOrEqual(1);
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

    // From 640px the same dialog is an aside: full height, 520px wide, at the inline-end (left).
    await page.setViewportSize({ width: 1024, height: 768 });
    await settled(dialog);
    const aside = await dialog.boundingBox();
    expect(aside?.x ?? -1).toBeLessThanOrEqual(1);
    expect(aside?.y ?? -1).toBeLessThanOrEqual(1);
    expect(aside?.height ?? 0).toBeGreaterThanOrEqual(766);
    expect(aside?.width ?? 0).toBeLessThanOrEqual(530);
    await expect(save).toBeInViewport({ ratio: 1 });
    await expect(dialog.getByRole('button', { name: ar.common.close })).toBeInViewport({ ratio: 1 });
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
