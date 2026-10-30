import type { Page } from '@playwright/test';
import { ar, expect, test } from '../../support/core/fixtures';
import { seedPackageStudent } from '../../support/finance/money';
import { resetAbrar } from '../../support/core/schedule';
import { fillTexts, pickAttendance, reportRow } from '../../support/reporting/teacher-extra';

// «تقرير الحلقة» drafts (R-REP-02): the form autosaves while it is a draft and a reopened form
// shows what was typed; an absence needs no grades and no texts (the Google Form's rule for a
// student who did not attend), and still sends. Journey 2 covers the attended first submit.

const SAVED = ar.reports.draftSaved.split('{time}')[0]?.trim() ?? '';

async function openForm(page: Page, lessonId: string): Promise<void> {
  await page.goto(`/teacher/report/${lessonId}`);
  await expect(page.getByRole('region', { name: ar.reports.identity })).toBeVisible();
}

test.describe('teacher report draft (R-REP-02)', () => {
  test('notes and homework autosave, survive leaving the page, and the report stays a draft', async ({ asRole }) => {
    test.setTimeout(90_000);
    const teacherId = await resetAbrar();
    const seed = await seedPackageStudent({ teacherId, paid: true, guardian: 'أم حبيبة', student: 'حبيبة' });
    const teacher = await asRole('teacher');
    await openForm(teacher, seed.todayLessonId);

    await fillTexts(teacher, { notes: 'بتتحسن كل أسبوع', homework: 'سورة النبأ 1-10' });
    await expect(teacher.getByRole('status').filter({ hasText: SAVED })).toBeVisible({ timeout: 15_000 });
    expect(await reportRow(seed.todayLessonId)).toMatchObject({
      status: 'draft',
      version: 0,
      texts: { notes: 'بتتحسن كل أسبوع', homework: 'سورة النبأ 1-10' },
    });

    // Away and back: the saved draft is what the form loads.
    await teacher.goto('/teacher');
    await openForm(teacher, seed.todayLessonId);
    await expect(teacher.getByRole('textbox', { name: ar.reports.notes, exact: true })).toHaveValue('بتتحسن كل أسبوع');
    await expect(teacher.getByRole('textbox', { name: ar.reports.homework, exact: true })).toHaveValue('سورة النبأ 1-10');
    await expect(teacher.getByRole('button', { name: ar.reports.submit })).toBeVisible();
    expect((await reportRow(seed.todayLessonId)).status).toBe('draft');
  });

  test('absent: nothing is required, no grades, and the report is sent', async ({ asRole }) => {
    test.setTimeout(90_000);
    const teacherId = await resetAbrar();
    const seed = await seedPackageStudent({ teacherId, paid: true, guardian: 'أم نورة', student: 'نورة' });
    const teacher = await asRole('teacher');
    await openForm(teacher, seed.todayLessonId);

    // Attendance still open: the five texts carry the star. «غياب بدون إشعار» lifts it.
    const recited = teacher.getByRole('textbox', { name: ar.reports.recited, exact: true });
    await expect(recited).toHaveAttribute('aria-required', 'true');
    await pickAttendance(teacher, 'absent');
    await expect(recited).not.toHaveAttribute('aria-required', 'true');
    await expect(teacher.getByRole('textbox', { name: ar.reports.homework, exact: true })).not.toHaveAttribute('aria-required', 'true');

    await teacher.getByRole('button', { name: ar.reports.submit }).click();
    await expect(teacher.getByText(ar.reports.submitted)).toBeVisible();
    const row = await reportRow(seed.todayLessonId);
    expect(row).toMatchObject({ status: 'submitted', version: 1, attendance: 'absent' });
    expect(Object.values(row.grades).every((g) => g === null)).toBe(true);
  });
});
