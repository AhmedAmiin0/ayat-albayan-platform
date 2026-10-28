import { coursePauseBanner, coursePauseErrorCode, coursePausePreviewText } from '@ab/client-core';
import type { CoursePauseResult, CoursePauseView } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { localDay } from '@/payments';

// What «إيقاف مؤقت» says on mobile: the shared lines (@ab/client-core) with the app's words and day format. Pure.

/** A failed write: its `t.coursePause.errors` line (generic for anything unknown). */
export const pauseErrorText = (error: unknown): string => t.coursePause.errors[coursePauseErrorCode(error)];

/** «ستُلغى N حلقات، وتُمدَّد الباقة بعدد أيام الإيقاف». */
export const previewLine = (lessons: number): string => coursePausePreviewText(t.coursePause.preview, lessons);

/** The banner's title, its start line while the pause has not begun, and the reason line. */
export function bannerLines(pause: CoursePauseView, today: string): { title: string; starts: string | null; reason: string | null } {
  const { title, starts } = coursePauseBanner({ pause, today, words: t.coursePause, formatDate: localDay });
  const reason = pause.reason ? t.coursePause.bannerReason.replace('{reason}', pause.reason) : null;
  return { title, starts, reason };
}

/** «استُؤنفت الدورة», or with the clashes of the lessons booked back. */
export const resumedText = (result: Pick<CoursePauseResult, 'conflicts'>): string =>
  result.conflicts > 0 ? t.coursePause.resumedConflicts.replace('{n}', String(result.conflicts)) : t.coursePause.resumed;
