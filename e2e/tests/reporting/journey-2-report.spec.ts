import { REPORT_RUBRICS } from '@ab/shared';
import { ar, expect, test } from '../../support/core/fixtures';
import { balanceOf, reportOf, seedPackageStudent } from '../../support/finance/money';
import { queuedFor, resetAbrar } from '../../support/core/schedule';

// Journey 2 (docs/03 §5, docs/11 §10; R-REP-01/02/03/04, R-SUB-01); needs the PDF job.

const PDF_WAIT = { timeout: 120_000, intervals: [1_000, 2_000, 5_000] };

test.describe('journey 2 — lesson report (R-REP-01..04)', () => {
  test('attendance → report sent → PDF ready → guardian message queued → 3 → 2 lessons left', async ({ asRole }) => {
    test.setTimeout(240_000);
    const teacherId = await resetAbrar();
    const seed = await seedPackageStudent({ teacherId, paid: true, guardian: 'أم سهيلة', student: 'سهيلة' });
    expect(await balanceOf(seed.subscriptionId)).toMatchObject({ remaining: 3 });

    // Today's started lesson is the running hero (docs/48).
    const page = await asRole('teacher');
    await page.goto('/teacher');
    const hero = page.getByRole('region', { name: ar.today.running });
    await hero.getByRole('button', { name: ar.today.details }).click();
    const drawer = page.getByRole('dialog', { name: /سهيلة/ });
    await drawer.getByRole('button', { name: ar.lessons.event.complete }).click();
    await expect(drawer.getByRole('status').filter({ hasText: ar.lessons.statusSaved })).toBeVisible();
    await drawer.getByRole('link', { name: ar.reports.open }).click();

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

    // Admin: the student's report history shows the PDF once the job rendered it. The page reads
    // the PDF state when it loads (no live update), so wait for the job's own state, then open it:
    // reloading inside a 2 s check could never pass while a cold page load took longer than that.
    const pdfStatus = async () => (await reportOf(seed.todayLessonId))?.pdf_status;
    await expect.poll(pdfStatus, PDF_WAIT).toBe('ready');
    const admin = await asRole('admin');
    await admin.goto(`/admin/students/${seed.studentId}/reports`);
    await expect(admin.getByRole('button', { name: ar.reports.downloadPdf })).toBeVisible();

    // The guardian's WhatsApp document is queued once (Phase 4 sends it), and the package dropped.
    await expect
      .poll(async () => (await queuedFor(seed.guardianId)).filter((m) => m.template_key === 'report_ready'), PDF_WAIT)
      .toEqual([expect.objectContaining({ lesson_id: seed.todayLessonId, status: 'queued' })]);
    expect(await balanceOf(seed.subscriptionId)).toMatchObject({ lessons_used: 2, remaining: 2 });
  });
});
