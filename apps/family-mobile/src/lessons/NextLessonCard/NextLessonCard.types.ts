import type { PortalLesson, PortalStudent } from '@ab/shared';

export interface NextLessonCardProps {
  lesson: PortalLesson;
  student: PortalStudent;
  full?: boolean;
  own?: boolean;
}
