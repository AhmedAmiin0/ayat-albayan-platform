import { reportV2Lines } from '@ab/client-core';
import type { ReportView } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { reportFields, type ReportField } from './report-fields';

/**
 * A new-form report (form_version 2) in the admin's words: attendance, program, each surah part
 * with its grade, the program's content, overall, homework, next plan and note (the web's lines,
 * @ab/client-core). Absent / excused: the attendance and the note only.
 */
function reportV2Fields(r: ReportView): ReportField[] {
  return reportV2Lines(r, { v2: t.reports.v2, grade: t.enums.grade, program: t.enums.program, lang: locale });
}

/** The fields the admin reads: the new form's lines, or the original form's (v1, unchanged). */
export const adminReportFields = (r: ReportView): ReportField[] =>
  r.form_version === 2 ? reportV2Fields(r) : reportFields(r);
