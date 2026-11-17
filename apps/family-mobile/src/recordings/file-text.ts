import { fileLineOf, fileTitleOf } from '@ab/client-core';
import type { PortalLessonFile } from '@ab/shared';
import { t } from '@ab/mobile-kit';

/** A file's name: its own title, else the word of its kind («ملف الواجب»). */
export const fileTitle = (file: PortalLessonFile): string => fileTitleOf(file, t.lessonFiles);

/** «ملف الواجب · صورة · 1.2 ميغابايت». */
export const fileLine = (file: PortalLessonFile): string => fileLineOf(file, t.lessonFiles);
