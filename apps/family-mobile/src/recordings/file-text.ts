import { fileLineOf, fileTitleOf } from '@ab/client-core';
import type { PortalLessonFile } from '@ab/shared';
import { t } from '@ab/mobile-kit';

/** Its own title, else the word for its kind. */
export const fileTitle = (file: PortalLessonFile): string => fileTitleOf(file, t.lessonFiles);

export const fileLine = (file: PortalLessonFile): string => fileLineOf(file, t.lessonFiles);
