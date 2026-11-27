import type { PortalLesson, PortalStudent } from '@ab/shared';

export interface JoinActionProps {
  lesson: PortalLesson;
  student: PortalStudent;
  now: Date;
  short?: boolean;
  live?: boolean;
}
