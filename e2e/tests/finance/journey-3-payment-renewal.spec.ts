import type { Page } from '@playwright/test';
import { ar, expect, test } from '../../support/fixtures';
import { balanceOf, seedPackageStudent, subscriptionStatus, tasksFor } from '../../support/finance/money';
import { queuedFor, resetAbrar } from '../../support/schedule';

// Journey 3 (docs/03 §5): the admin records a payment → the package is active → lessons are
// completed down to 2 left → a renewal reminder is queued for the guardian and an admin task is
// raised (R-PAY-01, R-SUB-01, R-SUB-02). The lesson outcome goes through the API, like the
// teacher's «حضر» button, so LessonEvents → the alerts run right away (no 15-minute sweep).

/** The e2e API (playwright.config.ts webServer, port 3100). */
const API = 'http://localhost:3100';

/** The signed-in admin's Supabase access token, from the page's own session. */
async function accessToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.endsWith('-auth-token'));
    const raw = key ? localStorage.getItem(key) : null;
    return raw ? (JSON.parse(raw) as { access_token?: string }).access_token ?? null : null;
  });
  if (!token) throw new Error('no Supabase session in the page');
  return token;
}

test.describe('journey 3 — payment → active → renewal at 2 left (R-PAY-01, R-SUB-02)', () => {
  test('records the transfer, completes a lesson, queues renewal_due and raises the task', async ({ asRole }) => {
    const teacherId = await resetAbrar();
    const seed = await seedPackageStudent({ teacherId, paid: false, guardian: 'أم سهيلة', student: 'سهيلة' });
    expect(await subscriptionStatus(seed.subscriptionId)).toBe('unpaid');
    expect(await balanceOf(seed.subscriptionId)).toMatchObject({ remaining: 3 });

    // The admin records the full price from the student's balance card.
    const page = await asRole('admin');
    await page.goto(`/admin/students/${seed.studentId}`);
    const card = page.getByRole('region', { name: ar.subscriptions.balance });
    await expect(card.getByText('بقيت 3 حلقات')).toBeVisible();
    await card.getByRole('button', { name: ar.payments.record }).click();
    const dialog = page.getByRole('dialog', { name: ar.payments.mobile.recordFor.replace('{student}', 'سهيلة') });
    await expect(dialog.getByLabel(new RegExp(ar.payments.amount))).toHaveValue(String(seed.price));
    await dialog.getByRole('button', { name: ar.payments.record }).click();
    await expect(page.getByRole('status')).toHaveText(ar.payments.saved);

    // Paid in full → active (no alert yet: 3 left).
    await expect.poll(() => subscriptionStatus(seed.subscriptionId)).toBe('active');
    await expect(card.getByText(ar.enums.subscriptionStatus.active)).toBeVisible();
    expect(await tasksFor(seed.subscriptionId)).toEqual([]);

    // Today's started lesson is completed → 2 left → R-SUB-02.
    const res = await page.request.post(`${API}/lessons/${seed.todayLessonId}/status`, {
      headers: { authorization: `Bearer ${await accessToken(page)}` },
      data: { event: 'complete' },
    });
    expect(res.status()).toBe(200);
    await expect.poll(() => balanceOf(seed.subscriptionId)).toMatchObject({ remaining: 2 });
    await expect
      .poll(() => tasksFor(seed.subscriptionId))
      .toEqual([{ kind: 'renewal_due', dedup_key: `renewal_due:${seed.subscriptionId}` }]);
    await expect
      .poll(() => queuedFor(seed.guardianId))
      .toContainEqual(expect.objectContaining({ template_key: 'renewal_due', status: 'queued' }));

    // The admin sees the task, worded from ar.json: on the dashboard with the live balance line;
    // on the packages page without it (the package row above carries the live balance).
    const task = ar.dashboard.task.renewal_due.replace('{student}', 'سهيلة');
    await page.goto('/admin?work=tasks');
    await expect(page.getByText(task.replace('{left}', 'بقيت حلقتان')).first()).toBeVisible();
    await page.goto('/admin/subscriptions');
    await expect(page.getByText(task.replace(/:\s*\{left\}$/, ''), { exact: true }).first()).toBeVisible();
  });
});
