import type { CourseMoveKind } from '@ab/client-core';
import type { ReactNode } from 'react';
import {
  BookingModeContext,
  CourseChangeTargetContext,
  type BookingMode,
} from '@/features/teaching/booking';
import { moveTarget } from './api';

export interface MoveFrameProps {
  studentId: string;
  kind: CourseMoveKind;
  /** admin: may save over a clash with a reason (R-SCH-04); sales never. */
  mode: BookingMode;
  /** «تغيير المعلم»: the new teacher, sent with the check and the change. */
  teacherId?: string | undefined;
  children: ReactNode;
}

/** The course-change form's routes for the profile: `/students/:id/course-teacher|course-times`. */
export function MoveFrame({ studentId, kind, mode, teacherId, children }: MoveFrameProps) {
  return (
    <BookingModeContext.Provider value={mode}>
      <CourseChangeTargetContext.Provider
        value={moveTarget({ studentId, kind, ...(teacherId ? { teacherId } : {}) })}
      >
        {children}
      </CourseChangeTargetContext.Provider>
    </BookingModeContext.Provider>
  );
}
