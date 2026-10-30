import { REPORT_RUBRICS, type ReportFormResponse } from '@ab/shared';
import type { Page } from '@playwright/test';
import { ar, expect, test } from '../../support/fixtures';
import { resetAbrar, seedFamily, seedLesson, withSql } from '../../support/schedule';

// Teacher payouts (R-PAY-02, R-TCH-04, issue E3) on /admin/payouts. Last month, because approving
// waits until the month is over in the teacher's zone. A lesson counts once its report is in (the
// report completes it, R-REP-03): «احسب مستحقات الشهر» = lessons × the rate per duration (EGP),
// a no-show is not paid (payout_count_no_show off); «اعتماد» is refused while a report is missing,
// then «إعادة الحساب» → «اعتماد» → «اتدفعت».

/** The e2e API (playwright.config.ts webServer, port 3100). */
const API = 'http://localhost:3100';
const GRADES = Object.fromEntries(REPORT_RUBRICS.map((r) => [r, 'very_good']));

/** Last month on the e2e teacher's clock (Africa/Cairo), YYYY-MM. */
function lastMonth(now = new Date()): string {
  const [y = 0, m = 1] = now.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }).split('-').map(Number);
  return new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
}

/** «45 دقيقة: 2 × 70 = 140 ج.م», the breakdown line of the payouts table. */
function line(duration: '45' | '60', lessons: number, rate: number): string {
  const text = ar.payouts.line
    .replace('{lessons}', String(lessons))
    .replace('{rate}', String(rate))
    .replace('{amount}', `${lessons * rate} ${ar.payouts.currency}`);
  return `${ar.pricing.durations[duration]}: ${text}`;
}

const TEXTS = { recited: 'الفاتحة', newMemorization: 'الملك 1-5', revision: 'جزء عم', notes: 'ممتازة', homework: 'الملك 6-10' };

/** The signed-in user's Supabase access token, from the page's own session. */
async function accessToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.endsWith('-auth-token'));
    const raw = key ? localStorage.getItem(key) : null;
    return raw ? ((JSON.parse(raw) as { access_token?: string }).access_token ?? null) : null;
  });
  if (!token) throw new Error('no Supabase session in the page');
  return token;
}

/** The teacher sends the lesson's report the way the form does: open it (draft), then submit. */
async function submitReport(page: Page, input: { lessonId: string; attendance: 'on_time' | 'absent' }) {
  const headers = { authorization: `Bearer ${await accessToken(page)}` };
  const opened = await page.request.get(`${API}/lessons/${input.lessonId}/report-form`, { headers });
  expect(opened.status()).toBe(200);
  const report = ((await opened.json()) as ReportFormResponse).entries[0]?.report;
  if (!report) throw new Error('no report on the lesson');
  // Attended: the grades and the five texts the Google Form required (research-forms 12).
  const graded = input.attendance === 'on_time' ? { grades: GRADES, overall: 'very_good', ...TEXTS } : {};
  const sent = await page.request.post(`${API}/reports/${report.id}/submit`, {
    headers,
    data: { attendance: input.attendance, expectedVersion: report.version, ...graded },
  });
  expect(sent.status()).toBe(200);
}

/** Rates 45 → 70, 60 → 90 EGP; no payout row left from an earlier run; four open lessons. */
async function seedMonth(teacherId: string, month: string) {
  await withSql(async (sql) => {
    await sql`update public.teachers set rate_45 = 70, rate_60 = 90 where id = ${teacherId}`;
    await sql`delete from public.teacher_payouts where teacher_id = ${teacherId}`;
  });
  const family = await seedFamily('أم جنى', ['جنى']);
  const [studentId = ''] = family.studentIds;
  const lesson = (day: string, minutes: number) =>
    seedLesson({ teacherId, studentId, startsAt: new Date(`${month}-${day}T10:00:00Z`), minutes });
  return { a: await lesson('10', 45), b: await lesson('11', 45), absent: await lesson('12', 60), last: await lesson('13', 60) };
}

type PayoutRow = { status: string; lessons_count: number; amount: number };

async function payoutOf(teacherId: string, month: string): Promise<PayoutRow | undefined> {
  return withSql(async (sql) => {
    const [row] = await sql<PayoutRow[]>`
      select status, lessons_count, amount::float8 as amount from public.teacher_payouts
      where teacher_id = ${teacherId} and month = ${`${month}-01`}`;
    return row;
  });
}

test.describe('payouts — last month from submitted reports → approve → paid (R-PAY-02, R-TCH-04)', () => {
  test('2 × 45 min paid, the no-show not; approve waits for the last report; 230 EGP paid', async ({ asRole }) => {
    test.setTimeout(120_000);
    const teacherId = await resetAbrar();
    const month = lastMonth();
    const lessons = await seedMonth(teacherId, month);

    // «أبرار» sends three of the four reports: two attended 45-minute lessons and one absence.
    const teacher = await asRole('teacher');
    await teacher.goto('/teacher');
    await submitReport(teacher, { lessonId: lessons.a, attendance: 'on_time' });
    await submitReport(teacher, { lessonId: lessons.b, attendance: 'on_time' });
    await submitReport(teacher, { lessonId: lessons.absent, attendance: 'absent' });

    // Admin: «احسب مستحقات الشهر» → 2 × 70 = 140 ج.م (the no-show is not paid).
    const admin = await asRole('admin');
    await admin.goto(`/admin/payouts?month=${month}`);
    await admin.getByRole('button', { name: ar.payouts.generate }).click();
    const row = admin.getByRole('row').filter({ hasText: 'أبرار' });
    const total = admin.locator('p').filter({ hasText: ar.expenses.total });
    await expect(row).toContainText(line('45', 2, 70));
    await expect(row.getByText(ar.enums.payoutStatus.draft)).toBeVisible();
    await expect(total).toContainText(`140 ${ar.payouts.currency}`);
    expect(await payoutOf(teacherId, month)).toEqual({ status: 'draft', lessons_count: 2, amount: 140 });

    // The last lesson has no report yet: approving would freeze a month that is still moving.
    await row.getByRole('button', { name: ar.payouts.approve }).click();
    await expect(admin.getByRole('alert').filter({ hasText: ar.payouts.error.reports_pending })).toBeVisible();
    expect(await payoutOf(teacherId, month)).toMatchObject({ status: 'draft' });

    // Its report arrives → «إعادة الحساب» adds the 60-minute lesson: 140 + 90 = 230 ج.م.
    await submitReport(teacher, { lessonId: lessons.last, attendance: 'on_time' });
    await admin.getByRole('button', { name: ar.payouts.regenerate }).click();
    await expect(row).toContainText(line('60', 1, 90));
    await expect(row).toContainText(line('45', 2, 70));
    await expect(total).toContainText(`230 ${ar.payouts.currency}`);
    expect(await payoutOf(teacherId, month)).toEqual({ status: 'draft', lessons_count: 3, amount: 230 });

    // «اعتماد» → «دُفعت» asks to confirm (date, method, receipt) → paid; only «إلغاء الدفع» is left.
    await row.getByRole('button', { name: ar.payouts.approve }).click();
    await expect(row.getByText(ar.enums.payoutStatus.approved)).toBeVisible();
    await row.getByRole('button', { name: ar.payouts.markPaid }).click();
    const confirm = admin.getByRole('dialog');
    await confirm.getByLabel(ar.payments.method, { exact: true }).selectOption('cash');
    await confirm.getByRole('button', { name: ar.finance.confirmPaid }).click();
    await expect(row.getByRole('button')).toHaveCount(1);
    await expect(row.getByRole('button', { name: ar.finance.unpay })).toBeVisible();
    await expect(row.getByText(ar.enums.payoutStatus.paid)).toBeVisible();
    await expect(total).toContainText(`230 ${ar.payouts.currency}`);
    expect(await payoutOf(teacherId, month)).toEqual({ status: 'paid', lessons_count: 3, amount: 230 });
  });
});
