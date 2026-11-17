import { useState } from 'react';
import { usePermissions } from '@/features/people/auth';
import type { BookingMode } from '@/features/teaching/booking';
import { t } from '@/lib/i18n/i18n';
import { ActionItem } from './card/ActionItem';
import { ExtendDialog } from './card/ExtendDialog';
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
  /** «مدّ الجدول»: lessons of the package have no date (owner 2026-11-17). */
  extend?: boolean;
  /** false: no «تغيير المعلم» / «تغيير موعد الحلقات» (no course booked yet: no dead end). */
  moves?: boolean;
}

type Open = 'stop' | 'teacher' | 'times' | 'extend' | null;
type Can = (key: 'students.change_teacher' | 'courses.reschedule') => boolean;

/** The moves offered, in the board's order, each with what it does (owner 2026-11-17). */
function moveItems(can: Can, props: Pick<CourseActionsProps, 'moves' | 'extend'>) {
  const words = t.courseActions;
  const hints = t.courseCard.hints;
  const moves = props.moves !== false;
  const times = can('courses.reschedule');
  const teacher = moves && can('students.change_teacher');
  const extend = props.extend === true && times;
  const items = [
    { open: 'teacher', label: words.teacher.action, hint: hints.teacher, on: teacher },
    { open: 'times', label: words.times.action, hint: hints.times, on: moves && times },
    { open: 'extend', label: t.courseCard.extend.action, hint: hints.extend, on: extend },
  ] as const;
  return items.filter((i) => i.on);
}

/**
 * The student profile's course actions (owner 2026-10-30), each behind its own key, with what it
 * does under it (owner 2026-11-17): «تغيير المعلم» (students.change_teacher), «تغيير موعد
 * الحلقات» and «مدّ الجدول» (courses.reschedule), «إلغاء الاشتراك» (subscriptions.stop).
 * Admins and sales, any student; not teachers.
 */
export function CourseActions(props: CourseActionsProps) {
  const { studentId, subscriptionId, mode, onDone } = props;
  const { can } = usePermissions();
  const [open, setOpen] = useState<Open>(null);
  const words = t.courseActions;
  const shared = {
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
      {moveItems(can, props).map((i) => (
        <ActionItem key={i.open} label={i.label} hint={i.hint} onClick={() => setOpen(i.open)} />
      ))}
      {can('subscriptions.stop') && (
        <ActionItem
          label={words.stop.action}
          hint={t.courseCard.hints.stop}
          onClick={() => setOpen('stop')}
          danger
        />
      )}
      {open === 'teacher' && <ChangeTeacherDialog {...shared} mode={mode} />}
      {open === 'times' && <ChangeTimesDialog {...shared} mode={mode} />}
      {open === 'extend' && <ExtendDialog {...shared} />}
      {open === 'stop' && <StopCourseDialog {...shared} />}
    </>
  );
}
