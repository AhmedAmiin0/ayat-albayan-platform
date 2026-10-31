import { courseMoveErrorCode } from '@ab/client-core';
import type { ProfileCourseView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Dialog } from '@/components/ui/overlay/dialog';
import { CourseChangeForm, type BookingMode } from '@/features/teaching/booking';
import { t } from '@/lib/i18n/i18n';
import { profileCourseQuery, useInvalidateCourseActions } from './api';
import { MoveFrame } from './MoveFrame';
import type { CourseActionDialogProps } from './StopCourseDialog';

export type MoveDialogProps = CourseActionDialogProps & { mode: BookingMode };

/** The course with its picks opening on «من تاريخ»'s default: the next lesson's day. */
export function fromNextLesson(view: ProfileCourseView, from?: string): ProfileCourseView {
  const start = from ?? view.nextLesson?.startsOn;
  if (!start || start <= view.course.startsOn) return view;
  return { ...view, course: { ...view.course, startsOn: start } };
}

/**
 * «تغيير موعد الحلقات» (owner 2026-10-30): the drawer's «تغيير أيام الحلقات» form on the
 * profile's course-times routes: new days and times from the next lesson, the remaining count
 * kept, the same clash check (the admin may save over it with a reason).
 */
export function ChangeTimesDialog({
  studentId,
  subscriptionId,
  mode,
  onClose,
  onDone,
}: MoveDialogProps) {
  const view = useQuery(profileCourseQuery({ studentId, subscriptionId, kind: 'times' }));
  const invalidate = useInvalidateCourseActions(studentId);
  const done = async () => {
    await invalidate();
    onDone(t.courseActions.times.done);
  };
  return (
    <Dialog title={t.courseActions.times.title} onClose={onClose} wide>
      {view.isPending && <p className="text-sm text-ink-3">{t.common.loading}</p>}
      {view.isError && (
        <FormAlert>{t.courseActions.errors[courseMoveErrorCode(view.error)]}</FormAlert>
      )}
      {view.data && (
        <MoveFrame studentId={studentId} kind="times" mode={mode}>
          <CourseChangeForm
            view={fromNextLesson(view.data)}
            onBack={onClose}
            onDone={() => void done()}
          />
        </MoveFrame>
      )}
    </Dialog>
  );
}
