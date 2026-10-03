import { REPORT_RUBRICS, type Grade, type Rubric } from '@ab/shared';
import { ar, expect, test } from '../support/fixtures';
import { seedPackageStudent } from '../support/money';
import { resetAbrar } from '../support/schedule';
import { fillTexts, pickAttendance, pickGrade, reportRow, TEXTS } from '../support/teacher-extra';

// «تقرير الحلقة» field → column mapping (docs/13-forms-spec.md form 2). forms-parity checks the
// titles, options, order and stars; journey 2 sends five texts and one grade for all. This sends
// every field with its own value (all seven texts, six different rubric grades, another program,
// a late arrival) and reads each column back, so a swapped rubric or text shows. It also reloads.

const GRADE_OF: Record<Rubric, Grade> = {
  recitation: 'excellent',
  memorization: 'very_good',
  revision: 'good',
  tajweed: 'acceptable',
  engagement: 'needs_review',
  commitment: 'excellent',
};
const LINK = 'meet.jit.si/ayat-e2e-abrar';

test.describe('teacher report form fields (docs/13 form 2)', () => {
  test('every field is saved in its own column and shown again on a reload', async ({ asRole }) => {
    test.setTimeout(90_000);
    const teacherId = await resetAbrar();
    const seed = await seedPackageStudent({ teacherId, paid: true, guardian: 'أم فاطمة', student: 'فاطمة' });
    const teacher = await asRole('teacher');
    await teacher.goto(`/teacher/report/${seed.todayLessonId}`);
    const identity = teacher.getByRole('region', { name: ar.reports.identity });
    await expect(identity.getByRole('link', { name: LINK })).toHaveAttribute('href', `https://${LINK}`);

    // «البرنامج» is the student's (quran) until the teacher changes it for this lesson.
    const program = identity.getByRole('group', { name: ar.reports.program });
    await expect(program.getByRole('radio', { name: ar.enums.program.quran })).toBeChecked();
    await program.getByRole('radio', { name: ar.enums.program.arabic }).locator('xpath=ancestor::label').click();
    await pickAttendance(teacher, 'late');
    await fillTexts(teacher, TEXTS);
    for (const rubric of REPORT_RUBRICS) {
      await pickGrade(teacher, { row: ar.reports.rubric[rubric], grade: GRADE_OF[rubric] });
    }
    await pickGrade(teacher, { row: ar.reports.overall, grade: 'very_good' });
    await teacher.getByRole('button', { name: ar.reports.submit }).click();
    await expect(teacher.getByText(ar.reports.submitted)).toBeVisible();

    const row = await reportRow(seed.todayLessonId);
    expect(row).toMatchObject({ status: 'submitted', version: 1, attendance: 'late', program: 'arabic' });
    expect(row.texts).toEqual(TEXTS);
    expect(row.grades).toEqual({ ...GRADE_OF, overall: 'very_good' });

    // The sent report loads back with every value in its place.
    await teacher.reload();
    await expect(identity.getByRole('radio', { name: ar.enums.attendance.late })).toBeChecked();
    await expect(program.getByRole('radio', { name: ar.enums.program.arabic })).toBeChecked();
    for (const [key, text] of Object.entries(TEXTS)) {
      await expect(teacher.getByRole('textbox', { name: ar.reports[key as keyof typeof TEXTS], exact: true })).toHaveValue(text);
    }
    for (const rubric of REPORT_RUBRICS) {
      const group = teacher.getByRole('group', { name: ar.reports.rubric[rubric] });
      await expect(group.getByRole('radio', { name: ar.enums.grade[GRADE_OF[rubric]], exact: true })).toBeChecked();
    }
  });
});
