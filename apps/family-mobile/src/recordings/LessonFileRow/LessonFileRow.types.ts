import type { PortalLessonFile } from '@ab/shared';

export interface LessonFileRowProps {
  file: PortalLessonFile;
  studentId: string;
  /** A picture or a PDF: opened in the phone's viewer. */
  onOpen: (fileId: string) => void;
}
