import {
  courseCardLines,
  extendDoneLines,
  extendPreviewLines,
  packageCardLines,
  packageWordsOf,
} from '@ab/client-core';
import type {
  CourseCardPackage,
  CourseCardView,
  CourseExtendPreview,
  CourseExtendResult,
} from '@ab/shared';
import { moneyText } from '@/features/finance/subscriptions';
import { dateLabel, dayIn } from '@/features/teaching/schedule';
import { t } from '@/lib/i18n/i18n';

// What «الدورة والباقة» and its previews say on web: the shared lines (@ab/client-core) with the
// app's words and day formats (the viewer's zone for an instant). Pure.

export const cardLines = (course: NonNullable<CourseCardView['course']>) =>
  courseCardLines({ course, words: t.courseCard, date: dateLabel });

/** «بقيت 3 حلقات», «12 حلقة · 9 من 12 حلقة · دُفع … من …» and «يُتوقع أن تنتهي يوم …». */
export const packageLines = (pkg: CourseCardPackage, tz: string) =>
  packageCardLines({
    pkg,
    words: packageWordsOf(t),
    format: { money: moneyText, day: dayIn(tz) },
  });

export const extendLines = (preview: CourseExtendPreview, tz: string): string[] =>
  extendPreviewLines({
    preview,
    words: { books: t.courseCard.extend.books, endsOn: t.courseActions.endsOn },
    format: { day: dayIn(tz), date: dateLabel },
  });

/** «حُجزت حلقتان · آخر حلقة في …» and the clashes line when some were stored. */
export function extendDoneText(result: CourseExtendResult): string {
  const words = { ...t.courseCard.extend, endsOn: t.courseActions.endsOn };
  return extendDoneLines({ result, words, date: dateLabel }).join(' · ');
}
