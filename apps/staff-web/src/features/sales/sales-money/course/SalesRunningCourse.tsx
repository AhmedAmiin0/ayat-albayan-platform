import { type BookedCourse, type SalesCourseView } from '@ab/shared';
import { useState, type ReactNode } from 'react';
import { Button, t } from '@ab/web-kit';
import { CourseChangeForm } from '@/features/teaching/booking';
import { BookingModeContext } from '@/features/teaching/booking';
import { SalesCourseActions } from './SalesCourseActions';

export interface SalesRunningCourseProps {
  view: SalesCourseView;
  current: BookedCourse;
  /** What the dialog shows besides the change (the renewal's choice, the wizard, a refusal); absent = only the change. */
  children?: ReactNode;
}

type Stage = 'ask' | 'change' | 'done';

/** A running course, or one booked ahead while a renewal waits; the change opens in this dialog. */
export function SalesRunningCourse({ view, current, children }: SalesRunningCourseProps) {
  const [stage, setStage] = useState<Stage>('ask');
  const { id, name, code, tz } = view.student;
  // A course booked ahead has not started; one with a pending change still runs its old days.
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
        <Button
          type="button"
          variant={children ? 'secondary' : 'primary'}
          onClick={() => setStage('change')}
        >
          {t.booking.courseChange.changeDays}
        </Button>
        <SalesCourseActions studentId={id} subscriptionId={current.subscriptionId} />
      </div>
      {children}
    </div>
  );
}
