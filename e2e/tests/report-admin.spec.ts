import { ar, expect, test } from '../support/fixtures';
import { seedPackageStudent } from '../support/money';
import { resetAbrar, withSql } from '../support/schedule';
import { apiSubmit, backdateSubmit, fillTexts, reportRow, TEXTS } from '../support/teacher-extra';
import { USERS } from '../support/users';

// Admin side of «تقرير الحلقة» (R-REP-02/03, R12, R-NFR-03): the teacher's window is closed (25 h
// ago) and the admin still corrects the sent report → version 2 and an audit row; a PDF that
// failed shows its state with «جهّز الـPDF تاني» → pending → ready; «تحميل PDF» gives a signed URL
// that serves the file under the report's name. The job renders in-process (ReportPdfModule).

const PDF_WAIT = { timeout: 150_000, intervals: [1_000, 2_000, 5_000] };
const EDITED = 'تعديل من الإدارة بعد مدة المعلمة';

test.describe('admin report edit and PDF (R-REP-02/03, R12)', () => {
  test('edit after the teacher window → audit; failed PDF → retry → ready → signed download', async ({ asRole }) => {
    test.setTimeout(540_000);
    const teacherId = await resetAbrar();
    const seed = await seedPackageStudent({ teacherId, paid: true, guardian: 'أم جميلة', student: 'جميلة' });
    const teacher = await asRole('teacher');
    await teacher.goto('/teacher');
    const reportId = await apiSubmit(teacher, { lessonId: seed.todayLessonId });
    await backdateSubmit(reportId, 25);

    // The admin opens the report from the student and edits the notes: version 2, one audit row.
    const admin = await asRole('admin');
    await admin.goto(`/admin/students/${seed.studentId}/reports/${seed.todayLessonId}`);
    await expect(admin.getByRole('textbox', { name: ar.reports.notes, exact: true })).toHaveValue(TEXTS.notes);
    await fillTexts(admin, { notes: EDITED });
    await admin.getByRole('button', { name: ar.reports.resubmit }).click();
    await expect(admin.getByText(ar.reports.version.replace('{n}', '2'))).toBeVisible();
    expect(await reportRow(seed.todayLessonId)).toMatchObject({ version: 2, status: 'submitted', texts: { notes: EDITED } });
    const audit = await withSql((sql) => sql<{ action: string; actor: string; was: string; now: string }[]>`
      select a.action, u.email as actor, a.before ->> 'notes' as was, a.after ->> 'notes' as now
      from public.audit_log a left join auth.users u on u.id = a.actor_id
      where a.entity = 'lesson_reports' and a.entity_id = ${reportId} order by a.at`);
    expect(audit.map((a) => a.action)).toEqual(['submit', 'edit']);
    expect(audit[1]).toMatchObject({ actor: USERS.admin.email, was: TEXTS.notes, now: EDITED });

    // The re-rendered PDF is ready; then it «fails»: the history shows the state and the retry.
    await expect.poll(async () => (await reportRow(seed.todayLessonId)).pdf_status, PDF_WAIT).toBe('ready');
    await withSql((sql) => sql`update public.lesson_reports set pdf_status = 'failed', pdf_error = 'e2e' where id = ${reportId}`);
    await admin.goto(`/admin/students/${seed.studentId}/reports`);
    const entry = admin.getByRole('region', { name: ar.reports.title }).locator('ol > li');
    await expect(entry.getByText(`${ar.reports.pdfLabel}: ${ar.enums.pdfStatus.failed}`)).toBeVisible();
    await entry.getByRole('button', { name: ar.reports.retryPdf }).click();
    await expect(entry.getByText(ar.reports.retryPdf)).toHaveCount(0);
    await expect.poll(async () => (await reportRow(seed.todayLessonId)).pdf_status, PDF_WAIT).toBe('ready');
    const error = await withSql((sql) => sql<{ pdf_error: string | null }[]>`select pdf_error from public.lesson_reports where id = ${reportId}`);
    expect(error).toEqual([{ pdf_error: null }]);

    // «تحميل PDF»: the API signs a URL; it serves the PDF, saved under the report's file name.
    await admin.reload();
    const [signed] = await Promise.all([
      admin.waitForResponse((r) => r.url().endsWith(`/reports/${reportId}/pdf`) && r.request().method() === 'GET'),
      entry.getByRole('button', { name: ar.reports.downloadPdf }).click(),
    ]);
    expect(signed.status()).toBe(200);
    const { url } = (await signed.json()) as { url: string };
    const file = await admin.request.get(url);
    expect(file.status()).toBe(200);
    expect(file.headers()['content-type']).toContain('application/pdf');
    expect((await file.body()).subarray(0, 4).toString()).toBe('%PDF');
    const [student] = await withSql((sql) => sql<{ code: string }[]>`select code from public.students where id = ${seed.studentId}`);
    const name = decodeURIComponent(url);
    expect(name).toContain(`${student?.code ?? ''}_`);
    expect(name).toContain(`${ar.reports.pdfFileSuffix}.pdf`);
  });
});
