import { courseMoveErrorCode } from '@ab/client-core';
import type { ProfileCourseView } from '@ab/shared';
import { wallParts, type BookingTeacherOption } from '@ab/schedule';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FormAlert, Dialog, t } from '@ab/web-kit';
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
    const named = t.courseActions.teacher.reviewNew.replace('{name}', teacher?.display_name_ar ?? '');
    onDone(`${t.courseActions.teacher.done} · ${named}`);
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

/** Remaining lessons move from the next lesson by default; the clash check is the new teacher's. */
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
