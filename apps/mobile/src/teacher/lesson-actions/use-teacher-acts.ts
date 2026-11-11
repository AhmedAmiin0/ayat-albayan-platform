import { teacherCanAct, teacherCanConfirm, teacherConfirmed } from '@ab/client-core';
import type { LessonView } from '@ab/shared';
import { useState } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import { useNow } from '@/core/lib/time/use-now';
import { teacherActionError, useTeacherConfirm } from './teacher-lesson-api';

/**
 * «سأحضر» and «إلغاء الحلقة» of one of her lessons (docs/46 C4, C3): what is offered now, the
 * confirm's own mutation, and whether the cancel form is open. `onNotice` says what landed.
 */
export function useTeacherActs(lesson: LessonView, onNotice: (text: string) => void) {
  const now = useNow();
  const confirm = useTeacherConfirm(lesson.id);
  const [cancelling, setCancelling] = useState(false);
  const confirmed = teacherConfirmed(lesson) || confirm.isSuccess;
  return {
    canConfirm: teacherCanConfirm(lesson, now) && !confirm.isSuccess,
    canCancel: teacherCanAct(lesson, now),
    /** «حضورك مؤكَّد» while the lesson is still ahead. */
    confirmed: confirmed && teacherCanAct(lesson, now),
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
