import { teacherCanAct } from '@ab/client-core';
import type { LessonView } from '@ab/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import { useNow } from '@/lib/time/use-now';
import { TeacherCancelDialog } from './TeacherCancelDialog';
import { TeacherConfirm } from './TeacherConfirm';

export interface TeacherLessonActionsProps {
  lesson: LessonView;
  onDone: (message: string) => void;
}

/**
 * The teacher's own steps on an open lesson before its start (docs/46 C6): «سأحضر» (then
 * «حضورك مؤكَّد») and «إلغاء الحلقة» (danger, a reason in a dialog). Each has its own mutation.
 * Fragments: they sit in the card's own one-column grid.
 */
export function TeacherLessonActions({ lesson, onDone }: TeacherLessonActionsProps) {
  const now = useNow();
  const [cancelling, setCancelling] = useState(false);
  return (
    <>
      <TeacherConfirm lesson={lesson} now={now} onDone={onDone} />
      {teacherCanAct(lesson, now) && (
        <Button type="button" variant="danger-quiet" size="lg" onClick={() => setCancelling(true)}>
          {t.teacherBoard.cancel}
        </Button>
      )}
      {cancelling && (
        <TeacherCancelDialog
          lessonId={lesson.id}
          onClose={() => setCancelling(false)}
          onDone={onDone}
        />
      )}
    </>
  );
}
