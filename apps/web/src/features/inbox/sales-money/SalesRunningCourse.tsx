import type { BookedCourse, SalesCourseView } from '@ab/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CourseChangeForm } from '@/features/booking/course-change/CourseChangeForm';
import { BookingModeContext } from '@/features/booking/mode';
import { t } from '@/lib/i18n';

export interface SalesRunningCourseProps {
  view: SalesCourseView;
  /** The student's running course (view.current). */
  current: BookedCourse;
}

type Stage = 'ask' | 'change' | 'done';

/**
 * «أيام الحلقات» of a student whose course is still running (blocked course_exists, owner 2026-10-18):
 * instead of only the refusal, «تغيير أيام الحلقات» opens the change form here, in the same dialog
 * (her own student, never over a clash), then «تغيّرت أيام الحلقات».
 */
export function SalesRunningCourse({ view, current }: SalesRunningCourseProps) {
  const [stage, setStage] = useState<Stage>('ask');
  const { id, name, code, tz } = view.student;
  if (stage === 'done') {
    return (
      <p role="status" className="rounded-md bg-sunk px-3.5 py-2.5 text-sm">
        {t.booking.courseChange.done}
      </p>
    );
  }
  if (stage === 'change') {
    return (
      <BookingModeContext.Provider value="sales">
        <CourseChangeForm
          view={{ student: { id, name, code, tz }, course: current }}
          onBack={() => setStage('ask')}
          onDone={() => setStage('done')}
        />
      </BookingModeContext.Provider>
    );
  }
  return (
    <div className="grid justify-items-start gap-3">
      <p role="status" className="rounded-md bg-sunk px-3.5 py-2.5 text-sm">
        {t.booking.courseChange.running}
      </p>
      <Button type="button" onClick={() => setStage('change')}>
        {t.booking.courseChange.changeDays}
      </Button>
    </div>
  );
}
