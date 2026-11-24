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

// Instants are shown in the viewer's zone; pure.

export const dayIn =
  (tz: string) =>
  (instant: string): string =>
    slotDayLabel(new Date(instant), tz);

export const cardLines = (course: NonNullable<CourseCardView['course']>) =>
  courseCardLines({ course, words: t.courseCard, date: localDay });

export const packageLines = (pkg: CourseCardPackage, tz: string) =>
  packageCardLines({
    pkg,
    words: packageWordsOf(t),
    format: { money, day: dayIn(tz) },
  });

export const pauseLines = (preview: CoursePausePreview, tz: string): string[] =>
  pausePreviewLines({ preview, words: t.coursePause, day: dayIn(tz) });

export const resumeLines = (preview: CourseResumePreview, tz: string): string[] =>
  resumePreviewLines({
    preview,
    words: { back: t.coursePause.resumeBack, extendDays: t.coursePause.resumeExtend },
    day: dayIn(tz),
  });

export const extendLines = (preview: CourseExtendPreview, tz: string): string[] =>
  extendPreviewLines({
    preview,
    words: { books: t.courseCard.extend.books, endsOn: t.courseActions.endsOn },
    format: { day: dayIn(tz), date: localDay },
  });
