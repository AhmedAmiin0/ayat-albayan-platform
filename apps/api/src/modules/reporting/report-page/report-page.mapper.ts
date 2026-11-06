import {
  REPORT_RUBRICS,
  RUBRIC_COLUMN,
  reportContentSchema,
  type Grade,
  type ReportPageFile,
  type ReportPageReport,
  type ReportPageView,
  type Rubric,
} from '@ab/shared';
import type { PageFacts, PageReportRow } from './report-page.types';

/** What the storage signed: each attachment's URL by path, and the PDF's (null while not ready). */
export interface PageUrls {
  files: ReadonlyMap<string, string>;
  pdf: string | null;
}

/** A stored content that no longer parses reads as none (the lines fall back to the columns). */
const content = (raw: unknown): ReportPageReport['content'] => {
  const parsed = reportContentSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
};

/** The saved answers only: never the PDF error, the storage paths or the edit window. */
function pageReport(row: PageReportRow): ReportPageReport {
  const grades = Object.fromEntries(
    REPORT_RUBRICS.map((r) => [r, row[RUBRIC_COLUMN[r]]]),
  ) as Record<Rubric, Grade | null>;
  const { attendance, program, recited, new_memorization, revision, theory } = row;
  const { grade_overall, notes, homework, next_plan, version, submitted_at, edited_at } = row;
  const form_version = row.form_version === 2 ? 2 : 1;
  const texts = { recited, new_memorization, revision, theory, notes, homework, next_plan };
  const when = { version, submitted_at, edited_at };
  return {
    form_version,
    attendance,
    program,
    ...texts,
    grades,
    grade_overall,
    ...when,
    content: content(row.content),
  };
}

/** The teacher's files in upload order with signed URLs (one Storage could not sign: left out). */
function pageFiles(row: PageReportRow, urls: PageUrls): ReportPageFile[] {
  const sorted = [...row.attachments].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return sorted.flatMap((f) => {
    const url = urls.files.get(f.storage_path);
    return url ? [{ id: f.id, mime: f.mime, size: f.size, url }] : [];
  });
}

export function toPageView(input: {
  row: PageReportRow;
  facts: PageFacts;
  urls: PageUrls;
}): ReportPageView {
  const { row, facts, urls } = input;
  return {
    public_id: row.public_id,
    student: { name: facts.student.name },
    teacher: { name: facts.teacher.display_name_ar },
    lesson: facts.lesson,
    tz: facts.student.tz,
    report: pageReport(row),
    attachments: pageFiles(row, urls),
    pdf: urls.pdf ? { url: urls.pdf } : null,
  };
}
