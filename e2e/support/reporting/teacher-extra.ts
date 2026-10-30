import { REPORT_RUBRICS, type Attendance, type Grade, type ReportFormResponse, type TextKey } from '@ab/shared';
import { expect, type Locator, type Page } from '@playwright/test';
import { ar } from '../core/fixtures';
import { API, bearer } from '../core/messages';
import { withSql } from '../core/schedule';

// Shared by the teacher report specs (B1, B4, B5): filling the real form, the API submit the
// payouts spec uses, and the SQL views of one report. Labels come from ar.json, never typed.

export const TEXTS: Record<TextKey, string> = {
  recited: 'الفاتحة',
  newMemorization: 'الملك 1-5',
  revision: 'جزء عم',
  theory: 'أحكام النون الساكنة',
  notes: 'ممتازة ما شاء الله',
  homework: 'سورة الملك من 1 لحد 10',
  nextPlan: 'نكمل الملك 11-15',
};
/** The five the Google Form required when the student attended (research-forms 12). */
const REQUIRED_TEXTS = ['recited', 'newMemorization', 'revision', 'notes', 'homework'] as const;

const identity = (page: Page) => page.getByRole('region', { name: ar.reports.identity });
const labelOf = (radio: Locator) => radio.locator('xpath=ancestor::label');

/** «الحضور»: the native radio is visually hidden, so the chip's label is what a teacher clicks. */
export async function pickAttendance(page: Page, attendance: Attendance): Promise<void> {
  const group = identity(page).getByRole('group', { name: ar.reports.attendance });
  await labelOf(group.getByRole('radio', { name: ar.enums.attendance[attendance] })).click();
}

/** One grade row («التلاوة والنطق» … «التقدير العام للحلقة»), clicked on its pip label. */
export async function pickGrade(page: Page, input: { row: string; grade: Grade }): Promise<void> {
  const row = page.getByRole('group', { name: input.row });
  await row.getByTitle(ar.enums.grade[input.grade], { exact: true }).click();
}

/** The six rubric rows and the overall grade, all the same grade. */
async function gradeAll(page: Page, grade: Grade): Promise<void> {
  for (const rubric of REPORT_RUBRICS) await pickGrade(page, { row: ar.reports.rubric[rubric], grade });
  await pickGrade(page, { row: ar.reports.overall, grade });
}

/** Text fields by their form titles. */
export async function fillTexts(page: Page, texts: Partial<Record<TextKey, string>>): Promise<void> {
  for (const [key, text] of Object.entries(texts) as [TextKey, string][]) {
    await page.getByRole('textbox', { name: ar.reports[key], exact: true }).fill(text);
  }
}

/** A full report for a student who attended: attendance, every grade, the five required texts. */
export async function fillAttended(page: Page, texts: Partial<Record<TextKey, string>> = {}): Promise<void> {
  await pickAttendance(page, 'on_time');
  await gradeAll(page, 'excellent');
  const required = Object.fromEntries(REQUIRED_TEXTS.map((k) => [k, TEXTS[k]]));
  await fillTexts(page, { ...required, ...texts });
}

interface ReportDb {
  id: string;
  student_id: string;
  version: number;
  status: string;
  attendance: string | null;
  program: string | null;
  pdf_status: string | null;
  pdf_path: string | null;
  sent_at: Date | null;
  submitted_at: Date | null;
  texts: Record<string, string | null>;
  grades: Record<string, string | null>;
}

/** The student's report on a lesson (the first one), with texts and grades as plain maps. */
export async function reportRow(lessonId: string): Promise<ReportDb> {
  return withSql(async (sql) => {
    const [r] = await sql<ReportDb[]>`
      select id, student_id, version, status, attendance, program, pdf_status, pdf_path, sent_at, submitted_at,
        jsonb_build_object('recited', recited, 'newMemorization', new_memorization, 'revision', revision,
          'theory', theory, 'notes', notes, 'homework', homework, 'nextPlan', next_plan) as texts,
        jsonb_build_object('recitation', grade_recitation, 'memorization', grade_memorization,
          'revision', grade_revision, 'tajweed', grade_tajweed, 'engagement', grade_engagement,
          'commitment', grade_commitment, 'overall', grade_overall) as grades
      from public.lesson_reports where lesson_id = ${lessonId} order by created_at limit 1`;
    if (!r) throw new Error('no report on the lesson (open the form first)');
    return r;
  });
}

/** The teacher sends a lesson's report the way the form does: open it (draft), then submit. */
export async function apiSubmit(page: Page, input: { lessonId: string; attendance?: 'on_time' | 'absent' }): Promise<string> {
  const headers = await bearer(page);
  const opened = await page.request.get(`${API}/lessons/${input.lessonId}/report-form`, { headers });
  expect(opened.status()).toBe(200);
  const report = ((await opened.json()) as ReportFormResponse).entries[0]?.report;
  if (!report) throw new Error('no report on the lesson');
  const attended = (input.attendance ?? 'on_time') === 'on_time';
  const grades = Object.fromEntries(REPORT_RUBRICS.map((r) => [r, 'very_good']));
  const graded = attended ? { grades, overall: 'very_good', ...TEXTS } : {};
  const sent = await page.request.post(`${API}/reports/${report.id}/submit`, {
    headers,
    data: { attendance: input.attendance ?? 'on_time', expectedVersion: report.version, ...graded },
  });
  expect(sent.status()).toBe(200);
  return report.id;
}

/** Moves the first submit back in time, so the teacher's edit window (24 h) has closed. */
export async function backdateSubmit(reportId: string, hours: number): Promise<void> {
  await withSql((sql) => sql`
    update public.lesson_reports set submitted_at = submitted_at - make_interval(hours => ${hours})
    where id = ${reportId}`);
}

interface StoredObject {
  etag: string | null;
  updated_at: Date;
}

/** One Storage object by bucket and path, or undefined when it is not there. */
export async function storedObject(input: { bucket: string; path: string }): Promise<StoredObject | undefined> {
  return withSql(async (sql) => {
    const [row] = await sql<StoredObject[]>`
      select metadata ->> 'eTag' as etag, updated_at from storage.objects
      where bucket_id = ${input.bucket} and name = ${input.path}`;
    return row;
  });
}
