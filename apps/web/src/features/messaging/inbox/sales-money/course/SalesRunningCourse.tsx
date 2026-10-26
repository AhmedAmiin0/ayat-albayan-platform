import { type BookedCourse, type SalesCourseView } from '@ab/shared';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/form/button';
import { CourseChangeForm } from '@/features/teaching/booking/course-change/CourseChangeForm';
import { BookingModeContext } from '@/features/teaching/booking/mode';
import { t } from '@/lib/i18n/i18n';

export interface SalesRunningCourseProps {
  view: SalesCourseView;
  /** The course «تغيير أيام الحلقات» changes (view.current). */
  current: BookedCourse;
  /** What the dialog shows besides the change (the renewal's choice, the wizard, a refusal); absent = only the change. */
  children?: ReactNode;
}

type Stage = 'ask' | 'change' | 'done';

/**
 * «أيام الحلقات» of a student with a course to change (view.current, owner 2026-10-18): a running one
 * (course_exists), or one booked ahead while a renewal waits. «تغيير أيام الحلقات» opens the change
 * form here, in the same dialog (her own student, never over a clash), then «تغيّرت أيام الحلقات»;
 * the rest of the dialog (children) stays below the entry until then.
 */
export function SalesRunningCourse({ view, current, children }: SalesRunningCourseProps) {
  const [stage, setStage] = useState<Stage>('ask');
  const { id, name, code, tz } = view.student;
  // A course booked ahead (a renewal) has not started yet: say so instead of «جارية». A course with a
  // pending change still runs its old days (running, from the server), whatever its latest startsOn.
  const ahead = !current.running;
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
    <div className="grid gap-4">
      <div className="grid justify-items-start gap-3">
        <p role="status" className="rounded-md bg-sunk px-3.5 py-2.5 text-sm">
          {ahead ? t.booking.courseChange.upcoming : t.booking.courseChange.running}
        </p>
        <Button type="button" variant={children ? 'secondary' : 'primary'} onClick={() => setStage('change')}>
          {t.booking.courseChange.changeDays}
        </Button>
      </div>
      {children}
    </div>
  );
}
