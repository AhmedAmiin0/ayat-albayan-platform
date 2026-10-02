import { REPORT_RUBRICS } from '@ab/shared';
import { ar, expect, test } from '../support/fixtures';
import { balanceOf, reportOf, seedPackageStudent } from '../support/money';
import { queuedFor, resetAbrar } from '../support/schedule';

// Journey 2 (docs/03 §5, docs/11 §10): teacher logs in → sees today's lesson → marks attendance →
// opens «تقرير الحلقة» → submits → PDF generated → guardian message queued → package balance
// decremented. R-REP-01/02/03/04, R-SUB-01. Needs the PDF job (ReportPdfModule) merged.

const PDF_WAIT = { timeout: 120_000, intervals: [1_000, 2_000, 5_000] };

test.describe('journey 2 — lesson report (R-REP-01..04)', () => {
  test('attendance → report sent → PDF ready → guardian message queued → 3 → 2 lessons left', async ({ asRole }) => {
    test.setTimeout(240_000);
    const teacherId = await resetAbrar();
    const seed = await seedPackageStudent({ teacherId, paid: true, guardian: 'أم سهيلة', student: 'سهيلة' });
    expect(await balanceOf(seed.subscriptionId)).toMatchObject({ remaining: 3 });

    // Teacher: today's lesson (already started) → «الحلقة تمت» → «تقرير الحلقة».
    const page = await asRole('teacher');
    await page.goto('/teacher');
    const card = page.getByRole('article', { name: /سهيلة/ });
    await card.getByRole('button', { name: ar.lessons.event.complete }).click();
    await expect(page.getByRole('status').filter({ hasText: ar.lessons.statusSaved })).toBeVisible();
    await card.getByRole('link', { name: ar.reports.formTitle }).click();

    // The identity is prefilled and read-only (R-REP-01); attendance comes from the card.
    const identity = page.getByRole('region', { name: ar.reports.identity });
    await expect(identity).toContainText('سهيلة');
    await expect(identity).toContainText('أبرار');
    await expect(identity.getByRole('textbox')).toHaveCount(0);
    await expect(page.getByRole('radio', { name: ar.enums.attendance.on_time })).toBeChecked();

    for (const rubric of REPORT_RUBRICS) {
      await page.getByRole('group', { name: ar.reports.rubric[rubric] }).getByTitle(ar.enums.grade.excellent).click();
    }
    await page.getByRole('group', { name: ar.reports.overall }).getByTitle(ar.enums.grade.very_good).click();
    // The five texts the Google Form required when the student attended (research-forms 12).
    const texts = {
      recited: 'الفاتحة',
      newMemorization: 'الملك 1-5',
      revision: 'جزء عم',
      notes: 'ممتازة ما شاء الله',
      homework: 'سورة الملك من 1 لحد 10',
    } as const;
    for (const [key, text] of Object.entries(texts) as [keyof typeof texts, string][]) {
      await page.getByRole('textbox', { name: ar.reports[key], exact: true }).fill(text);
    }
    await page.getByRole('button', { name: ar.reports.submit }).click();
    await expect(page.getByText(ar.reports.submitted)).toBeVisible();
    expect(await reportOf(seed.todayLessonId)).toMatchObject({ status: 'submitted', version: 1 });

    // Admin: the student's report history shows the PDF once the job rendered it.
    const admin = await asRole('admin');
    await admin.goto(`/admin/students/${seed.studentId}/reports`);
    await expect(async () => {
      await admin.reload();
      await expect(admin.getByRole('button', { name: ar.reports.downloadPdf })).toBeVisible({ timeout: 2_000 });
    }).toPass(PDF_WAIT);
    await expect.poll(async () => (await reportOf(seed.todayLessonId))?.pdf_status, PDF_WAIT).toBe('ready');

    // The guardian's WhatsApp document is queued once (Phase 4 sends it), and the package dropped.
    await expect
      .poll(async () => (await queuedFor(seed.guardianId)).filter((m) => m.template_key === 'report_ready'), PDF_WAIT)
      .toEqual([expect.objectContaining({ lesson_id: seed.todayLessonId, status: 'queued' })]);
    expect(await balanceOf(seed.subscriptionId)).toMatchObject({ lessons_used: 2, remaining: 2 });
  });
});
