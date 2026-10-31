import { courseMoveErrorCode } from '@ab/client-core';
import { wallParts, type BookingTeacherOption, type ProfileCourseView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Dialog } from '@/components/ui/overlay/dialog';
import { t } from '@/lib/i18n/i18n';
import { courseTeachersQuery, profileCourseQuery, useInvalidateCourseActions } from './api';
import type { MoveDialogProps } from './ChangeTimesDialog';
import { MoveFrame } from './MoveFrame';
import { TeacherMove } from './TeacherMove';
import { TeacherPickStep, type TeacherDraft } from './TeacherPickStep';

type StepsProps = Omit<MoveDialogProps, 'onClose' | 'subscriptionId'> & {
  view: ProfileCourseView;
  teachers: BookingTeacherOption[];
};

function TeacherSteps({ studentId, mode, view, teachers, onDone }: StepsProps) {
  const today = wallParts(new Date().toISOString(), view.course.tz).date;
  const [draft, setDraft] = useState<TeacherDraft>({
    teacherId: '',
    keep: true,
    from: view.nextLesson?.startsOn ?? today,
  });
  const [moving, setMoving] = useState(false);
  const invalidate = useInvalidateCourseActions(studentId);
  const teacher = teachers.find((x) => x.id === draft.teacherId);
  const done = async () => {
    await invalidate();
    onDone(t.courseActions.teacher.done);
  };
  if (moving && teacher) {
    return (
      <MoveFrame studentId={studentId} kind="teacher" mode={mode} teacherId={teacher.id}>
        <TeacherMove
          view={view}
          teacher={teacher}
          draft={draft}
          onBack={() => setMoving(false)}
          onDone={() => void done()}
        />
      </MoveFrame>
    );
  }
  return (
    <TeacherPickStep
      view={view}
      teachers={teachers}
      draft={draft}
      today={today}
      onDraft={(patch) => setDraft((d) => ({ ...d, ...patch }))}
      onNext={() => setMoving(true)}
    />
  );
}

/**
 * «تغيير المعلم» (owner 2026-10-30): the remaining lessons move to another teacher, on the same
 * days or new ones, from the next lesson by default; the clash check is the new teacher's.
 */
export function ChangeTeacherDialog({
  studentId,
  subscriptionId,
  mode,
  onClose,
  onDone,
}: MoveDialogProps) {
  const view = useQuery(profileCourseQuery({ studentId, subscriptionId, kind: 'teacher' }));
  const teachers = useQuery(courseTeachersQuery(studentId));
  const error = view.error ?? teachers.error;
  return (
    <Dialog title={t.courseActions.teacher.title} onClose={onClose} wide>
      {(view.isPending || teachers.isPending) && !error && (
        <p className="text-sm text-ink-3">{t.common.loading}</p>
      )}
      {error && <FormAlert>{t.courseActions.errors[courseMoveErrorCode(error)]}</FormAlert>}
      {view.data && teachers.data && (
        <TeacherSteps
          studentId={studentId}
          mode={mode}
          view={view.data}
          teachers={teachers.data}
          onDone={onDone}
        />
      )}
    </Dialog>
  );
}
