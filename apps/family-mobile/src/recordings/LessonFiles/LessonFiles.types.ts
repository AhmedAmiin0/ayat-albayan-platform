import type { PortalLessonFile } from '@ab/shared';

export interface LessonFilesProps {
  studentId: string;
  reportId: string;
  files: readonly PortalLessonFile[];
}
