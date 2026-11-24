import { pausePreviewLines, resumePreviewLines } from '@ab/client-core';
import {
  coursePauseProblem,
  type CoursePausePreview,
  type CoursePauseProblem,
  type CoursePauseStart,
  type CourseResumePreview,
} from '@ab/shared';
import { dayIn } from '@/features/teaching/schedule';
import { t } from '@ab/web-kit/lib/i18n/i18n';

/** Dates are YYYY-MM-DD; an empty until means until resumed. */
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

/** A pause preview: the lessons with their dates, then the package extension. */
export const pauseLines = (preview: CoursePausePreview, tz: string): string[] =>
  pausePreviewLines({ preview, words: t.coursePause, day: dayIn(tz) });

/** A resume preview: the lessons back with their dates and the days the package moves. */
export const resumeLines = (preview: CourseResumePreview, tz: string): string[] =>
  resumePreviewLines({
    preview,
    words: { back: t.coursePause.resumeBack, extendDays: t.coursePause.resumeExtend },
    day: dayIn(tz),
  });
