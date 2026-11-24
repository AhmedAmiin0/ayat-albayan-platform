import { confirmedChipShown, confirmedNow, teacherCanAct } from '@ab/client-core';
import type { LessonView } from '@ab/schedule';
import { useState } from 'react';
import { t, useNow } from '@ab/mobile-kit';
import { teacherActionError, useTeacherConfirm } from './teacher-lesson-api';

export function useTeacherActs(lesson: LessonView, onNotice: (text: string) => void) {
  const now = useNow();
  const confirm = useTeacherConfirm(lesson.id);
  const [cancelling, setCancelling] = useState(false);
  const answer = confirm.data;
  return {
    canConfirm: teacherCanAct(lesson, now) && !confirmedNow(lesson, answer),
    canCancel: teacherCanAct(lesson, now),
    confirmed: confirmedChipShown(lesson, { answer, now }),
    busy: confirm.isPending,
    error: confirm.isError ? teacherActionError(confirm.error) : undefined,
    confirm: () =>
      confirm.mutate(undefined, { onSuccess: () => onNotice(t.teacherBoard.confirmedOk) }),
    cancelling,
    openCancel: () => setCancelling(true),
    closeCancel: () => setCancelling(false),
    /** A landed cancel: the form closes (review 11-11), then the notice. */
    cancelDone: (text: string) => {
      setCancelling(false);
      onNotice(text);
    },
  };
}

export type TeacherActs = ReturnType<typeof useTeacherActs>;
