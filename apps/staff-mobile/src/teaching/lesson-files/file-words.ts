import { fileLineOf, fileTitleOf } from '@ab/client-core';
import type { LessonFileView } from '@ab/shared';
import { t } from '@ab/mobile-kit';

/** A file's name: its own title, else the word of its kind. */
export const fileTitle = (file: LessonFileView): string => fileTitleOf(file, t.lessonFiles);

/** «ملف الواجب · صورة · 0.9 ميغابايت». */
export const fileLine = (file: LessonFileView): string => fileLineOf(file, t.lessonFiles);
