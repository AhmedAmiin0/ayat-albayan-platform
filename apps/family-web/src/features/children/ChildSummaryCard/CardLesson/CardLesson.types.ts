import type { PortalStudent } from '@ab/shared';
import type { NextLessonRead } from '@/features/next-lesson';

export interface CardLessonProps {
  student: PortalStudent;
  read: NextLessonRead;
}
