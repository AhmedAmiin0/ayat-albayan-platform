import { REPORT_RUBRICS, type ReportPageReport } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';

/** What the fields read: a ReportView (GET /reports/:id) or the live page's saved report. */
export type FieldsReport = Omit<ReportPageReport, 'version' | 'submitted_at' | 'edited_at'>;

export interface ReportField {
  /** Unique: the rubric repeats the words «الحفظ الجديد» and «المراجعة». */
  key: string;
  label: string;
  /** null = the teacher left it blank. */
  value: string | null;
}

/** The report's text in the form's order and words (the web's form, read-only); blank stays visible. */
export function reportFields(r: FieldsReport): ReportField[] {
  const m = t.reports;
  const grade = (g: FieldsReport['grade_overall']) => (g ? t.enums.grade[g] : null);
  return [
    {
      key: 'attendance',
      label: m.attendance,
      value: r.attendance ? t.enums.attendance[r.attendance] : null,
    },
    { key: 'program', label: m.program, value: r.program ? t.enums.program[r.program] : null },
    { key: 'recited', label: m.recited, value: r.recited },
    { key: 'newMemorization', label: m.newMemorization, value: r.new_memorization },
    { key: 'revision', label: m.revision, value: r.revision },
    { key: 'theory', label: m.theory, value: r.theory },
    ...REPORT_RUBRICS.map((k) => ({
      key: `rubric.${k}`,
      label: m.rubric[k],
      value: grade(r.grades[k]),
    })),
    { key: 'overall', label: m.overall, value: grade(r.grade_overall) },
    { key: 'notes', label: m.notes, value: r.notes },
    { key: 'homework', label: m.homework, value: r.homework },
    { key: 'nextPlan', label: m.nextPlan, value: r.next_plan },
  ];
}
