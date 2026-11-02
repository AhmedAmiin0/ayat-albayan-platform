import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { usePermissions } from '@/features/people/auth';
import type { BookingMode } from '@/features/teaching/booking';
import { t } from '@/lib/i18n/i18n';
import { ChangeTeacherDialog } from './ChangeTeacherDialog';
import { ChangeTimesDialog } from './ChangeTimesDialog';
import { StopCourseDialog } from './StopCourseDialog';

export interface CourseActionsProps {
  studentId: string;
  /** The current package (its course). */
  subscriptionId: string;
  /** admin (the student file) may save over a clash with a reason; sales never. */
  mode: BookingMode;
  /** The page's toast. */
  onDone: (message: string) => void;
}

type Open = 'stop' | 'teacher' | 'times' | null;

/**
 * The student profile's course actions (owner 2026-10-30), each behind its own key:
 * «تغيير المعلم» (students.change_teacher), «تغيير موعد الحلقات» (courses.reschedule) and
 * «إلغاء الاشتراك» (subscriptions.stop). Admins and sales, any student; not teachers.
 */
export function CourseActions({ studentId, subscriptionId, mode, onDone }: CourseActionsProps) {
  const { can } = usePermissions();
  const [open, setOpen] = useState<Open>(null);
  const words = t.courseActions;
  const props = {
    studentId,
    subscriptionId,
    onClose: () => setOpen(null),
    onDone: (message: string) => {
      setOpen(null);
      onDone(message);
    },
  };
  return (
    <>
      {can('students.change_teacher') && (
        <Button type="button" variant="secondary" onClick={() => setOpen('teacher')}>
          {words.teacher.action}
        </Button>
      )}
      {can('courses.reschedule') && (
        <Button type="button" variant="secondary" onClick={() => setOpen('times')}>
          {words.times.action}
        </Button>
      )}
      {can('subscriptions.stop') && (
        <Button type="button" variant="danger-quiet" onClick={() => setOpen('stop')}>
          {words.stop.action}
        </Button>
      )}
      {open === 'teacher' && <ChangeTeacherDialog {...props} mode={mode} />}
      {open === 'times' && <ChangeTimesDialog {...props} mode={mode} />}
      {open === 'stop' && <StopCourseDialog {...props} />}
    </>
  );
}
