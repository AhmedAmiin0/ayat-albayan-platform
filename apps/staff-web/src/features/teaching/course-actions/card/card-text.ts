import { courseCardLines, extendPreviewLines } from '@ab/client-core';
import {
  counted,
  type CourseCardView,
  type CourseExtendPreview,
  type CourseExtendResult,
} from '@ab/shared';
import { dateLabel, dayIn } from '@/features/teaching/schedule';
import { t } from '@/lib/i18n/i18n';

// What «الدورة والباقة» and its previews say on web: the shared lines (@ab/client-core) with the
// app's words and day formats (the viewer's zone for an instant). Pure.

export const cardLines = (course: NonNullable<CourseCardView['course']>) =>
  courseCardLines({ course, words: t.courseCard, date: dateLabel });

export const extendLines = (preview: CourseExtendPreview, tz: string): string[] =>
  extendPreviewLines({
    preview,
    words: { books: t.courseCard.extend.books, endsOn: t.courseActions.endsOn },
    format: { day: dayIn(tz), date: dateLabel },
  });

/** «حُجزت حلقتان · آخر حلقة في …» and the clashes line when some were stored. */
export function extendDoneText(result: CourseExtendResult): string {
  const c = t.courseCard.extend;
  const head = result.inserted === 0 ? c.done.zero : counted(c.done, result.inserted);
  const end = result.endsOn ? [t.courseActions.endsOn.replace('{date}', dateLabel(result.endsOn))] : [];
  return [head, ...end, ...(result.conflicts > 0 ? [c.clashes] : [])].join(' · ');
}
