import type { BookingMode } from '@ab/client-core';
import type { ReactNode } from 'react';
import {
  BookingModeContext,
  CourseChangeTargetContext,
  type CourseChangeTarget,
} from '@/features/teaching/booking';

export interface MoveFrameProps {
  /** admin: may save over a clash with a reason (R-SCH-04); sales never. */
  mode: BookingMode;
  /** The profile's route table the course-change form checks and saves on. */
  target: CourseChangeTarget;
  children: ReactNode;
}

export function MoveFrame({ mode, target, children }: MoveFrameProps) {
  return (
    <BookingModeContext.Provider value={mode}>
      <CourseChangeTargetContext.Provider value={target}>
        {children}
      </CourseChangeTargetContext.Provider>
    </BookingModeContext.Provider>
  );
}
