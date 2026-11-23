import type { ReportDraft, ReportV2Draft, ReportView } from '@ab/shared';

type AnyDraft = ReportDraft & Pick<ReportV2Draft, 'content'>;

const VIEW_KEY = {
  attendance: 'attendance',
  program: 'program',
  recited: 'recited',
  newMemorization: 'new_memorization',
  revision: 'revision',
  theory: 'theory',
  overall: 'grade_overall',
  notes: 'notes',
  homework: 'homework',
  nextPlan: 'next_plan',
  content: 'content',
} as const satisfies Record<Exclude<keyof AnyDraft, 'grades'>, keyof ReportView>;

const sent = (entry: [string, unknown]): boolean => entry[1] !== undefined;

/** The report as the server would hold it once this stored draft is saved (absent = unchanged). */
export function viewWithDraft(view: ReportView, draft: ReportDraft | ReportV2Draft): ReportView {
  const { grades, ...rest } = { grades: undefined, ...draft };
  const fields = Object.entries(rest).filter(sent);
  const renamed = Object.fromEntries(
    fields.map(([key, value]) => [VIEW_KEY[key as keyof typeof VIEW_KEY], value]),
  );
  return { ...view, ...renamed, grades: { ...view.grades, ...grades } };
}
