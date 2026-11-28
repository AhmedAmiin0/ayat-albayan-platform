import type { BookingMode } from '@ab/client-core';
import { courseMoveErrorCode } from '@ab/client-core';
import type { ProfileCourseView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { FormAlert, Dialog, t } from '@ab/web-kit';
import { CourseChangeForm } from '@/features/teaching/booking';
import { profileCourseQuery, useInvalidateCourseActions } from './api';
import { MoveFrame } from './MoveFrame';
import { timesMoveTarget } from './move-target';
import type { CourseActionDialogProps } from './StopCourseDialog';

export type MoveDialogProps = CourseActionDialogProps & { mode: BookingMode };

/** Picks open on the default start date: the next lesson's day. */
export function fromNextLesson(view: ProfileCourseView, from?: string): ProfileCourseView {
  const start = from ?? view.nextLesson?.startsOn;
  if (!start || start <= view.course.startsOn) return view;
  return { ...view, course: { ...view.course, startsOn: start } };
}

/** Remaining count kept; same clash check, which the admin may override with a reason. */
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
        <MoveFrame mode={mode} target={timesMoveTarget(studentId)}>
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
