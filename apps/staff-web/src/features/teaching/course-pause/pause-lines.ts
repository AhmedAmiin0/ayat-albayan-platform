import { pausePreviewLines, resumePreviewLines } from '@ab/client-core';
import type { CoursePausePreview, CourseResumePreview } from '@ab/shared';
import { dayIn } from '@/features/teaching/schedule';
import { t } from '@/lib/i18n/i18n';

// «ما سيحدث» of a pause and of a resume on web (owner 2026-11-17): the shared lines
// (@ab/client-core) with the app's words and the viewer's day labels. Pure.

/** The lessons cancelled with their dates, then how far the package moves on resume. */
export const pauseLines = (preview: CoursePausePreview, tz: string): string[] =>
  pausePreviewLines({ preview, words: t.coursePause, day: dayIn(tz) });

/** The lessons back with their dates and the days the package moves. */
export const resumeLines = (preview: CourseResumePreview, tz: string): string[] =>
  resumePreviewLines({
    preview,
    words: { back: t.coursePause.resumeBack, extendDays: t.coursePause.resumeExtend },
    day: dayIn(tz),
  });
