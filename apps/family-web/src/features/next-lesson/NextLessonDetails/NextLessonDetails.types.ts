import type { PortalLesson, PortalStudent } from '@ab/shared';

export interface NextLessonDetailsProps {
  lesson: PortalLesson;
  student: PortalStudent;
  now: Date;
  open: boolean;
  full?: boolean;
}

export type Shown = Pick<NextLessonDetailsProps, 'lesson' | 'now' | 'open'> & { full: boolean };
