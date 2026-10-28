import type { Json } from '@ab/db';
import {
  attended,
  keptContent,
  legacyGrades,
  reportContentSchema,
  suggestHomework,
  suggestNextPlan,
  type ReportContent,
  type ReportV2Draft,
  type ReportV2Submit,
  type ReportView,
} from '@ab/shared';
import { ar } from '../../../../common/i18n/server-text';
import { formColumns, submitColumns, type FormColumns } from '../report.mapper';

type StoredForm = { form_version: number; content: Json | null };

/** The stored v2 content, re-read through the schema (defaults filled); null on v1 or a row it cannot read. */
export function storedContent(row: StoredForm): ReportContent | null {
  if (row.form_version !== 2 || row.content === null) return null;
  const parsed = reportContentSchema.safeParse(row.content);
  return parsed.success ? parsed.data : null;
}

/** The two ReportView fields of the new form. */
export function v2Fields(row: StoredForm): Pick<ReportView, 'form_version' | 'content'> {
  return { form_version: row.form_version === 2 ? 2 : 1, content: storedContent(row) };
}

/** content is plain JSON (strings, numbers, nulls, arrays); TS cannot see the zod output as Json. */
const asJson = (content: ReportContent) => content as unknown as Json;

/**
 * v2 autosave → columns: the v1 columns the forms share (attendance, program, overall, notes,
 * homework, next plan) through formColumns, and the content when sent. Only keys sent are written.
 */
export function v2DraftColumns(form: Partial<ReportV2Draft>): FormColumns {
  const { content, ...shared } = form;
  const out = formColumns(shared);
  if (content !== undefined) out.content = asJson(content);
  return out;
}

/**
 * v2 submit → the whole row and the content to store. Absent / excused: no content, no grades,
 * no homework or plan (the form hides them); only the note stays. Attended: the taught program's
 * content, and the v1 grade columns it fills (legacyGrades) so history and the chart read it.
 */
export function v2SubmitColumns(form: ReportV2Submit): { columns: FormColumns; content: ReportContent } {
  const present = form.attendance ? attended(form.attendance) : false;
  const content = form.attendance ? keptContent(form.attendance, form.program, form.content) : form.content;
  const legacy = legacyGrades(content);
  const quran = form.program === 'quran';
  const columns = submitColumns({
    attendance: form.attendance,
    program: form.program,
    notes: form.notes,
    ...(present
      ? {
          overall: form.overall,
          // Left untouched on the form: the suggestion it showed, in Arabic (the family's report).
          homework: form.homework === undefined && quran ? suggestHomework(content, ar.reports.v2.suggest) : form.homework,
          nextPlan: form.nextPlan === undefined && quran ? suggestNextPlan(content, ar.reports.v2.suggest) : form.nextPlan,
          grades: { recitation: legacy.grade_recitation, memorization: legacy.grade_memorization, revision: legacy.grade_revision },
        }
      : {}),
  });
  return { columns, content };
}

/** The content as the RPC payload carries it. */
export const contentJson = asJson;
