import { coursePauseProblem, type CoursePauseProblem, type CoursePauseStart } from '@ab/shared';

/** The sheet's fields: dates "YYYY-MM-DD", an empty until = until «استئناف». */
export interface PauseDraft {
  from: string;
  until: string;
  reason: string;
}

export const draftOn = (today: string): PauseDraft => ({ from: today, until: '', reason: '' });

/** The API's 400 before it is sent: an empty or past start, an end before the start. */
export function draftProblem(draft: PauseDraft, today: string): CoursePauseProblem | null {
  if (!draft.from) return 'date_in_past';
  return coursePauseProblem({ from: draft.from, until: draft.until || null, today });
}

/** POST /students/:id/course-pause: the reason only when typed. */
export function startBody(draft: PauseDraft): CoursePauseStart {
  const reason = draft.reason.trim();
  return { fromDate: draft.from, untilDate: draft.until || null, ...(reason ? { reason } : {}) };
}
