import { ATTACHMENT_MAX_BYTES } from '@ab/shared';
import type { Page } from '@playwright/test';
import { ar, expect, test } from '../support/fixtures';
import { seedPackageStudent } from '../support/finance/money';
import { resetAbrar, withSql } from '../support/schedule';
import { reportRow, storedObject } from '../support/teacher-extra';

// «المرفقات (اختياري)» (R-REP-02, R7–R9): a signed upload to Storage, then the report_attachments
// row; the teacher removes a file again (row and object); a type or size the bucket would refuse
// is turned down in the form with the Arabic reason and nothing is stored.

const BUCKET = 'report-attachments';
const PDF = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n');
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

type Row = { id: string; mime: string; size: number; storage_path: string };
const attachmentsOf = (reportId: string) =>
  withSql((sql) => sql<Row[]>`
    select id, mime, size::int as size, storage_path from public.report_attachments
    where report_id = ${reportId} order by created_at`);

async function openDraft(page: Page): Promise<{ reportId: string; lessonId: string }> {
  const teacherId = await resetAbrar();
  const seed = await seedPackageStudent({ teacherId, paid: true, guardian: 'أم رقية', student: 'رقية' });
  await page.goto(`/teacher/report/${seed.todayLessonId}`);
  await expect(page.getByRole('region', { name: ar.reports.identity })).toBeVisible();
  return { reportId: (await reportRow(seed.todayLessonId)).id, lessonId: seed.todayLessonId };
}

const field = (page: Page) => page.getByRole('region', { name: ar.reports.attachments });
const item = (page: Page, kind: string) => field(page).getByRole('listitem').filter({ hasText: kind });

test.describe('teacher report attachments (R-REP-02)', () => {
  test('a PDF and a PNG are listed with a row and a stored object; removing one deletes both', async ({ asRole }) => {
    test.setTimeout(90_000);
    const teacher = await asRole('teacher');
    const { reportId } = await openDraft(teacher);
    const input = field(teacher).locator('input[type=file]');

    await input.setInputFiles({ name: 'ورقة.pdf', mimeType: 'application/pdf', buffer: PDF });
    await expect(item(teacher, ar.reports.fileKind.pdf)).toHaveCount(1);
    await input.setInputFiles({ name: 'صورة.png', mimeType: 'image/png', buffer: PNG });
    await expect(item(teacher, ar.reports.fileKind.image)).toHaveCount(1);

    const rows = await attachmentsOf(reportId);
    expect(rows.map((r) => [r.mime, r.size])).toEqual([['application/pdf', PDF.length], ['image/png', PNG.length]]);
    for (const row of rows) {
      expect(row.storage_path.startsWith(`${reportId}/`)).toBe(true);
      expect(await storedObject({ bucket: BUCKET, path: row.storage_path })).toBeDefined();
    }

    await item(teacher, ar.reports.fileKind.pdf).getByRole('button', { name: ar.reports.removeAttachment }).click();
    await expect(item(teacher, ar.reports.fileKind.pdf)).toHaveCount(0);
    const [pdf, png] = rows;
    expect((await attachmentsOf(reportId)).map((r) => r.id)).toEqual([png?.id]);
    expect(await storedObject({ bucket: BUCKET, path: pdf?.storage_path ?? '' })).toBeUndefined();

    // The remaining file is part of the report: it is still listed after a reload.
    await teacher.reload();
    await expect(item(teacher, ar.reports.fileKind.image)).toHaveCount(1);
  });

  test('an .exe and a file over 25 MB are refused with the Arabic reason; nothing is stored', async ({ asRole }) => {
    test.setTimeout(90_000);
    const teacher = await asRole('teacher');
    const { reportId } = await openDraft(teacher);
    const input = field(teacher).locator('input[type=file]');
    const alert = field(teacher).getByRole('alert');

    await input.setInputFiles({ name: 'setup.exe', mimeType: 'application/x-msdownload', buffer: Buffer.from('MZ') });
    await expect(alert).toHaveText(ar.reports.error.attachment_type);
    await input.setInputFiles({ name: 'كبير.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(ATTACHMENT_MAX_BYTES + 1) });
    await expect(alert).toHaveText(ar.reports.error.attachment_too_large);

    await expect(field(teacher).getByRole('listitem')).toHaveCount(0);
    expect(await attachmentsOf(reportId)).toEqual([]);
  });
});
