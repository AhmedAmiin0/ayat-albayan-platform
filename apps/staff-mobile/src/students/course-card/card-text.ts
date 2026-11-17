import {
  courseCardLines,
  extendPreviewLines,
  packageCardLines,
  packageWordsOf,
  pausePreviewLines,
  resumePreviewLines,
} from '@ab/client-core';
import type {
  CourseCardPackage,
  CourseCardView,
  CourseExtendPreview,
  CoursePausePreview,
  CourseResumePreview,
} from '@ab/shared';
import { money, slotDayLabel, t } from '@ab/mobile-kit';
import { localDay } from '@/payments';

// What «الدورة والباقة» and its previews say on mobile: the shared lines (@ab/client-core) with
// the app's words and day formats (the viewer's zone for an instant). Pure.

/** «الأحد 22 نوفمبر» of an instant in the viewer's zone. */
export const dayIn =
  (tz: string) =>
  (instant: string): string =>
    slotDayLabel(new Date(instant), tz);

/** The card's teacher · last day line and «بقيت حلقتان بلا مواعيد». */
export const cardLines = (course: NonNullable<CourseCardView['course']>) =>
  courseCardLines({ course, words: t.courseCard, date: localDay });

/** «بقيت 3 حلقات», «12 حلقة · 9 من 12 حلقة · دُفع … من …» and «يُتوقع أن تنتهي يوم …». */
export const packageLines = (pkg: CourseCardPackage, tz: string) =>
  packageCardLines({
    pkg,
    words: packageWordsOf(t),
    format: { money, day: dayIn(tz) },
  });

/** «إيقاف مؤقت»'s «ما سيحدث». */
export const pauseLines = (preview: CoursePausePreview, tz: string): string[] =>
  pausePreviewLines({ preview, words: t.coursePause, day: dayIn(tz) });

/** «استئناف الدورة الآن؟»'s lines. */
export const resumeLines = (preview: CourseResumePreview, tz: string): string[] =>
  resumePreviewLines({
    preview,
    words: { back: t.coursePause.resumeBack, extendDays: t.coursePause.resumeExtend },
    day: dayIn(tz),
  });

/** «مدّ الجدول حتى نهاية الباقة؟»'s lines. */
export const extendLines = (preview: CourseExtendPreview, tz: string): string[] =>
  extendPreviewLines({
    preview,
    words: { books: t.courseCard.extend.books, endsOn: t.courseActions.endsOn },
    format: { day: dayIn(tz), date: localDay },
  });
