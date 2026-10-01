import type { Page } from '@playwright/test';
import { ar, expect, test } from '../support/fixtures';

// Journey 6 (docs/03 §5): duplicate student creation blocked and merged. R-STU-02, R-STU-03.

type NewStudent = { phone: string; guardian: string; name: string };

async function createStudent(page: Page, s: NewStudent): Promise<void> {
  await page.getByRole('button', { name: ar.students.add }).click();
  const dialog = page.getByRole('dialog', { name: ar.students.add });
  await dialog.getByLabel(ar.guardians.phone, { exact: true }).fill(s.phone);
  await dialog.getByLabel(ar.guardians.name, { exact: true }).fill(s.guardian);
  await dialog.getByLabel(ar.students.name, { exact: true }).fill(s.name);
  await dialog.getByRole('button', { name: ar.common.save }).click();
}

test.describe('journey 6 — duplicate student (R-STU-03)', () => {
  test('same phone in another format + سهيلة/سهيله is caught and merged into one student', async ({
    asRole,
  }) => {
    // desktop and mobile share one DB: a fresh Saudi mobile per run keeps them independent.
    const digits = String(Date.now()).slice(-8);
    const page = await asRole('admin');
    await page.goto('/admin/students');

    await createStudent(page, { phone: `+966 5${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4)}`, guardian: 'أم جود', name: 'سهيلة' });
    await expect(page.getByRole('status')).toHaveText(ar.students.created);

    // Same guardian phone typed the local way, name with ه instead of ة.
    await createStudent(page, { phone: `05${digits}`, guardian: 'ام جود', name: 'سهيله' });
    // The duplicate step is its own dialog, titled by the warning (docs/07 §6 Dialog).
    const dialog = page.getByRole('dialog', { name: ar.students.duplicateTitle });
    await expect(dialog.getByRole('heading', { name: ar.students.duplicateTitle })).toBeVisible();
    await expect(dialog.getByText('سهيلة', { exact: false })).toBeVisible();

    await dialog.getByRole('button', { name: ar.students.merge, exact: true }).click();
    const merge = page.getByRole('dialog', { name: ar.students.mergeTitle });
    await expect(merge).toContainText('سهيله');
    await merge.getByRole('button', { name: ar.common.confirm }).click();
    await expect(page.getByRole('status')).toHaveText(ar.students.mergeDone);

    // Search by the guardian phone: exactly one student left, the original سهيلة.
    await page.getByRole('textbox', { name: ar.common.search }).fill(`05${digits}`);
    await page.getByRole('button', { name: ar.common.search, exact: true }).click();
    const rows = page.getByRole('row');
    await expect(rows).toHaveCount(2); // header + one student
    await expect(rows.nth(1)).toContainText('سهيلة');
    await expect(rows.nth(1)).toContainText(/AB-\d{4,}/);

    // The keyboard path to the profile exists at every width, Pixel 7 included: the name is a
    // button right after the search, and Enter opens the merged student's profile.
    const name = rows.nth(1).getByRole('button', { name: 'سهيلة', exact: true });
    await page.getByRole('button', { name: ar.common.search, exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(name).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/admin\/students\/[^/?]+$/);
    await expect(page.getByRole('heading', { level: 1, name: 'سهيلة' })).toBeVisible();
  });
});
