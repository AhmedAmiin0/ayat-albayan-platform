import { REPORT_RUBRICS } from '@ab/shared';
import type { Page } from '@playwright/test';
import { ar, expect, test } from '../../support/core/fixtures';
import { API, bearer } from '../../support/messages';
import { seedPackageStudent } from '../../support/finance/money';
import { queuedFor, resetAbrar, withSql } from '../../support/schedule';
import { backdateSubmit, fillAttended, fillTexts, reportRow, storedObject, TEXTS } from '../../support/reporting/teacher-extra';

// Edit window and versions (R-REP-02/04, R-NFR-03): inside report_teacher_edit_hours (24) the
// teacher corrects the sent report → version 2, the PDF is rendered again, the guardian's
// report_ready is not queued twice; after it the form is read-only and the API says
// edit_window_closed; two tabs on one report → the second submit gets version_conflict.

// Polled every second: the submit kicks the PDF job (ready in a few seconds), a 5 s step overshot it.
const PDF_WAIT = { timeout: 150_000, intervals: [1_000] };
const when = (text: string) => text.split('{when}')[0]?.trim() ?? '';

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

test.describe('teacher report edit window (R-REP-02/04)', () => {
  test('inside 24 h: edit → version 2, PDF re-rendered, report_ready not re-queued, audit edit', async ({ asRole }) => {
    test.setTimeout(420_000);
    const s = await seed();
    const teacher = await asRole('teacher');
    await sendFirst(teacher, s.todayLessonId);
    await expect(teacher.getByText(when(ar.reports.editUntil))).toBeVisible();
    await expect.poll(async () => (await reportRow(s.todayLessonId)).pdf_status, PDF_WAIT).toBe('ready');
    const first = await reportRow(s.todayLessonId);
    const pdf = { bucket: 'reports', path: first.pdf_path ?? '' };
    const before = await storedObject(pdf);
    expect(before).toBeDefined();

    await fillTexts(teacher, { homework: 'سورة الملك 11-20' });
    await teacher.getByRole('button', { name: ar.reports.resubmit }).click();
    await expect(teacher.getByText(ar.reports.version.replace('{n}', '2'))).toBeVisible();
    expect(await reportRow(s.todayLessonId)).toMatchObject({ version: 2, status: 'submitted', texts: { homework: 'سورة الملك 11-20' } });
    const audit = await withSql((sql) => sql<{ action: string }[]>`
      select action from public.audit_log where entity = 'lesson_reports' and entity_id = ${first.id} order by at`);
    expect(audit.map((a) => a.action)).toEqual(['submit', 'edit']);

    // The job renders version 2 over the same object; the guardian's message was queued once.
    await expect
      .poll(async () => {
        const row = await reportRow(s.todayLessonId);
        const now = await storedObject(pdf);
        const changed = now?.etag !== before?.etag || now?.updated_at.getTime() !== before?.updated_at.getTime();
        return row.pdf_status === 'ready' && changed;
      }, PDF_WAIT)
      .toBe(true);
    expect((await queuedFor(s.guardianId)).filter((m) => m.template_key === 'report_ready')).toHaveLength(1);
  });

  test('after 24 h: read-only with the closed note, and the API answers edit_window_closed', async ({ asRole }) => {
    test.setTimeout(120_000);
    const s = await seed();
    const teacher = await asRole('teacher');
    await sendFirst(teacher, s.todayLessonId);
    const row = await reportRow(s.todayLessonId);
    await backdateSubmit(row.id, 25);

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
