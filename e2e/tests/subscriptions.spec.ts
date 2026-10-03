import { formatAmount, quote } from '@ab/shared';
import type { Page } from '@playwright/test';
import { ar, expect, test } from '../support/fixtures';
import { API, bearer } from '../support/messages';
import { subscriptionStatus, tasksFor } from '../support/money';
import { guardianPhoneOf, riyadhToday, seedNearEmpty, uniqueName } from '../support/money-extra';
import { addDays, resetAbrar, seedFamily, withSql } from '../support/schedule';

// Subscriptions (R-SUB-01/02): a new package through the calculator dialog (the quote preview is
// the stored price), pause / resume, and the last lesson of a PAID package → «غير مدفوع» + the
// future lesson flag + the subscription_unpaid admin task. Journey 3 owns payment → active → renewal.

const SAR = ar.pricing.currencies.SAR;
const row = (page: Page, student: string) => page.getByRole('row').filter({ hasText: student });

interface Stored {
  status: string;
  lessons_total: number;
  price: number;
  currency: string;
  package: string | null;
  starts_on: string;
}

async function storedFor(studentId: string): Promise<Stored[]> {
  return withSql((sql) => sql<Stored[]>`
    select status, lessons_total, price::float as price, currency, package, starts_on::text as starts_on
    from public.subscriptions where student_id = ${studentId}`);
}

const statusOf = async (studentId: string) => (await storedFor(studentId))[0]?.status;

test.describe('subscriptions (R-SUB-01/02)', () => {
  test('new package: quote preview → discount + start date → unpaid, 8 lessons; pause / resume', async ({ asRole }) => {
    const student = uniqueName('جنى');
    const family = await seedFamily('أم جنى', [student]);
    const studentId = family.studentIds[0] ?? '';
    const phone = await guardianPhoneOf(family.guardianId);
    const input = { tier: 'starter', duration: 45, country: 'SA', students: 1 } as const;
    const full = quote({ ...input, discount: 0 });
    const cut = quote({ ...input, discount: 10 });
    const startsOn = addDays(riyadhToday(), 1);

    const page = await asRole('admin');
    await page.goto('/admin/subscriptions');
    await page.getByRole('button', { name: ar.subscriptions.new }).click();
    const dialog = page.getByRole('dialog', { name: ar.subscriptions.new });
    await dialog.getByLabel(ar.payments.mobile.chooseStudent, { exact: true }).fill(phone);
    await dialog.getByRole('button', { name: new RegExp(student) }).click();
    await dialog.getByLabel(ar.subscriptions.package, { exact: true }).selectOption('starter');
    await dialog.getByLabel(ar.subscriptions.duration, { exact: true }).selectOption('45');
    await dialog.getByLabel(ar.subscriptions.country, { exact: true }).selectOption('SA');

    // The preview is the API's catalog quote in the guardian's currency, never a typed price.
    const preview = dialog.getByRole('figure');
    await expect(preview).toContainText(`${formatAmount(full.afterDiscount)} ${SAR}`);
    await dialog.getByLabel(ar.subscriptions.discount, { exact: true }).fill('10');
    await expect(preview).toContainText(`${formatAmount(cut.afterDiscount)} ${SAR}`);
    await dialog.getByLabel(ar.subscriptions.startsOn, { exact: true }).fill(startsOn);
    await dialog.getByRole('button', { name: ar.common.save }).click();
    await expect(page.getByRole('status')).toHaveText(ar.subscriptions.saved);

    expect(await storedFor(studentId)).toEqual([
      { status: 'unpaid', lessons_total: 8, price: cut.afterDiscount, currency: 'SAR', package: '8', starts_on: startsOn },
    ]);
    // The newest package leads the list, unpaid, with the whole package left.
    const line = row(page, student);
    await expect(line).toContainText(ar.enums.subscriptionStatus.unpaid);
    await expect(line).toContainText(ar.subscriptions.progress.left.few.replace('{n}', '8'));

    // Pause → paused; resume → back to what the money says (nothing paid yet: unpaid).
    await line.getByRole('button', { name: ar.subscriptions.pause }).click();
    await expect(line).toContainText(ar.enums.subscriptionStatus.paused);
    expect(await statusOf(studentId)).toBe('paused');
    await line.getByRole('button', { name: ar.subscriptions.resume }).click();
    await expect(line).toContainText(ar.enums.subscriptionStatus.unpaid);
    expect(await statusOf(studentId)).toBe('unpaid');

    // The student's balance card shows the same package.
    await page.goto(`/admin/students/${studentId}`);
    const card = page.getByRole('region', { name: ar.subscriptions.balance });
    await expect(card.getByText(ar.enums.subscriptionStatus.unpaid, { exact: true })).toBeVisible();
  });

  test('0 left on a paid package → unpaid, the future lesson is flagged, subscription_unpaid task', async ({ asRole }) => {
    const student = uniqueName('ريم');
    const teacherId = await resetAbrar();
    const seed = await seedNearEmpty({ teacherId, guardian: 'أم ريم', student });
    expect(await subscriptionStatus(seed.subscriptionId)).toBe('active');

    const page = await asRole('admin');
    const day = `/admin/schedule?view=day&day=${addDays(riyadhToday(), 1)}`;
    await page.goto(day);
    const chip = () => page.getByRole('region', { name: 'أبرار', exact: true }).getByRole('button', { name: new RegExp(student) });
    await expect(chip()).toBeVisible();
    await expect(chip()).not.toContainText(ar.subscriptions.unpaidFlag);

    // Today's started lesson is completed (the teacher's «حضر» goes through this route).
    const res = await page.request.post(`${API}/lessons/${seed.todayLessonId}/status`, {
      headers: await bearer(page),
      data: { event: 'complete' },
    });
    expect(res.status()).toBe(200);
    await expect.poll(() => subscriptionStatus(seed.subscriptionId)).toBe('unpaid');
    await expect
      .poll(() => tasksFor(seed.subscriptionId))
      .toContainEqual({ kind: 'subscription_unpaid', dedup_key: `subscription_unpaid:${seed.subscriptionId}` });

    await page.goto(day);
    await expect(chip()).toContainText(ar.subscriptions.unpaidFlag);
    await page.goto(`/admin/students/${seed.studentId}`);
    const card = page.getByRole('region', { name: ar.subscriptions.balance });
    await expect(card.getByText(ar.subscriptions.unpaidFlag, { exact: true })).toBeVisible();
    await expect(card.getByText(ar.subscriptions.progress.zero, { exact: true })).toBeVisible();
    await page.goto('/admin/subscriptions');
    const task = ar.dashboard.task.subscription_unpaid.replace('{student}', student);
    await expect(page.getByText(task, { exact: true })).toBeVisible();
  });
});
