import { REPORT_RUBRICS } from '@ab/shared';
import type { Page } from '@playwright/test';
import { ar, expect, test } from '../../support/core/fixtures';
import { API, bearer, setSetting } from '../../support/core/messages';
import { seedPackageStudent } from '../../support/finance/money';
import { queuedFor, resetAbrar, withSql } from '../../support/core/schedule';
import { fillAttended, fillTexts, reportRow, TEXTS } from '../../support/reporting/teacher-extra';

// Edit window and versions (R-REP-02/03/04, docs/46 D5, R-NFR-03): report_teacher_edit_minutes = 30
// here (the shared seed is 0, sent at once). Inside the window the teacher corrects the sent report
// → version 2, and nothing goes to the family; once the window (first submit + 30 min, never
// extended by the edit) has closed, the PDF job renders the final version once and queues ONE
// report_ready. After it the form is read-only and the API says edit_window_closed; two tabs on one
// report → the second submit gets version_conflict.

// The job sweeps every 60 s; the render itself takes a few seconds.
const PDF_WAIT = { timeout: 150_000, intervals: [1_000] };
const WINDOW_MIN = 30;
const when = (text: string) => text.split('{when}')[0]?.trim() ?? '';

/** The first submit moved back by `minutes`, as if the window had run (submitted_at is the anchor). */
const backdateMinutes = (reportId: string, minutes: number) =>
  withSql((sql) => sql`
    update public.lesson_reports set submitted_at = submitted_at - make_interval(mins => ${minutes})
    where id = ${reportId}`);

async function open(page: Page, lessonId: string): Promise<void> {
  await page.goto(`/teacher/report/${lessonId}`);
  await expect(page.getByRole('region', { name: ar.reports.identity })).toBeVisible();
}

async function sendFirst(page: Page, lessonId: string): Promise<void> {
  await open(page, lessonId);
  await fillAttended(page);
  await page.getByRole('button', { name: ar.reports.submit }).click();
  await expect(page.getByText(ar.reports.submitted)).toBeVisible();
}

const seed = async () => {
  const teacherId = await resetAbrar();
  return seedPackageStudent({ teacherId, paid: true, guardian: 'أم سلمى', student: 'سلمى' });
};

const readyQueued = async (guardianId: string) =>
  (await queuedFor(guardianId)).filter((m) => m.template_key === 'report_ready');

test.describe('teacher report edit window (R-REP-02/03/04)', () => {
  test.beforeEach(() => setSetting('report_teacher_edit_minutes', WINDOW_MIN));
  test.afterEach(() => setSetting('report_teacher_edit_minutes', 0));

  test('inside 30 min: edit → version 2, nothing sent; at the close ONE render and ONE report_ready', async ({ asRole }) => {
    test.setTimeout(420_000);
    const s = await seed();
    const teacher = await asRole('teacher');
    await sendFirst(teacher, s.todayLessonId);
    await expect(teacher.getByText(when(ar.reports.editUntil))).toBeVisible();
    await expect(teacher.getByText(when(ar.reports.familySend.sendsIn))).toBeVisible();
    const first = await reportRow(s.todayLessonId);

    // Sent: read-only until «تعديل التقرير», which re-opens the same report (owner 2026-11-06).
    const homework = teacher.getByRole('textbox', { name: ar.reports.homework, exact: true });
    await expect(homework).toBeDisabled();
    await teacher.getByRole('button', { name: ar.reports.edit, exact: true }).click();
    await fillTexts(teacher, { homework: 'سورة الملك 11-20' });
    await teacher.getByRole('button', { name: ar.reports.resubmit }).click();
    await expect(teacher.getByText(ar.reports.version.replace('{n}', '2'))).toBeVisible();
    expect(await reportRow(s.todayLessonId)).toMatchObject({ version: 2, status: 'submitted', texts: { homework: 'سورة الملك 11-20' } });
    const audit = await withSql((sql) => sql<{ action: string }[]>`
      select action from public.audit_log where entity = 'lesson_reports' and entity_id = ${first.id} order by at`);
    expect(audit.map((a) => a.action)).toEqual(['submit', 'edit']);

    // Inside the window: no PDF, nothing queued for the family (the submit's kick finds nothing due).
    expect((await reportRow(s.todayLessonId)).pdf_status).toBe('pending');
    expect(await readyQueued(s.guardianId)).toHaveLength(0);

    // The window closes (first submit + 30 min; the edit did not extend it): the sweep renders v2 once.
    await backdateMinutes(first.id, WINDOW_MIN + 1);
    await expect.poll(async () => (await reportRow(s.todayLessonId)).pdf_status, PDF_WAIT).toBe('ready');
    expect(await readyQueued(s.guardianId)).toHaveLength(1);
    await teacher.reload();
    await expect(teacher.getByText(ar.reports.editClosed)).toBeVisible();
  });

  test('after 30 min: read-only with the closed note, and the API answers edit_window_closed', async ({ asRole }) => {
    test.setTimeout(120_000);
    const s = await seed();
    const teacher = await asRole('teacher');
    await sendFirst(teacher, s.todayLessonId);
    const row = await reportRow(s.todayLessonId);
    await backdateMinutes(row.id, WINDOW_MIN + 1);

    await teacher.reload();
    await expect(teacher.getByText(ar.reports.editClosed)).toBeVisible();
    await expect(teacher.getByRole('textbox', { name: ar.reports.homework, exact: true })).toBeDisabled();
    await expect(teacher.getByRole('button', { name: ar.reports.resubmit })).toHaveCount(0);
    await expect(teacher.getByRole('button', { name: ar.reports.attach })).toHaveCount(0);

    const res = await teacher.request.post(`${API}/reports/${row.id}/submit`, {
      headers: await bearer(teacher),
      data: {
        attendance: 'on_time',
        expectedVersion: 1,
        grades: Object.fromEntries(REPORT_RUBRICS.map((r) => [r, 'very_good'])),
        overall: 'very_good',
        ...TEXTS,
        homework: 'متأخر',
      },
    });
    expect(res.status()).toBe(409);
    expect(await res.json()).toMatchObject({ code: 'edit_window_closed' });
    expect((await reportRow(s.todayLessonId)).texts['homework']).toBe(TEXTS.homework);
  });

  test('two tabs: the second submit of a stale form gets version_conflict', async ({ asRole }) => {
    test.setTimeout(120_000);
    const s = await seed();
    const one = await asRole('teacher');
    const two = await one.context().newPage();
    await open(one, s.todayLessonId);
    await open(two, s.todayLessonId);

    await fillAttended(one);
    await one.getByRole('button', { name: ar.reports.submit }).click();
    await expect(one.getByText(ar.reports.submitted)).toBeVisible();

    await fillAttended(two, { notes: 'من التبويب التاني' });
    await two.getByRole('button', { name: ar.reports.submit }).click();
    await expect(two.getByRole('alert').filter({ hasText: ar.reports.error.version_conflict })).toBeVisible();
    expect(await reportRow(s.todayLessonId)).toMatchObject({ version: 1, texts: { notes: 'ممتازة ما شاء الله' } });
  });
});
