import type { LessonView } from '@ab/shared';
import { useState } from 'react';
import { LessonDetailsSheet, LessonRowActions } from '@/calendar';
import { JoinAround } from '@/classroom';
import { EditTimeSheet } from '@/edit-time';
import { RescheduleSheet } from '@/teaching';
import type { useLessonAction } from '@/today/lib/use-lesson-action';

interface AdminLessonSheetProps {
  /** The lesson to show; null = closed. */
  lesson: LessonView | null;
  onClose: () => void;
  /** The screen's one confirm / cancel mutation (R-MOB-03). */
  action: ReturnType<typeof useLessonAction>;
  /** Opened from this student's own file: their name stays plain. */
  hereStudentId?: string | undefined;
}

export function AdminLessonSheet(props: AdminLessonSheetProps) {
  const { lesson, onClose, action, hereStudentId } = props;
  const [moving, setMoving] = useState<LessonView | null>(null);
  const [editing, setEditing] = useState<LessonView | null>(null);
  return (
    <LessonDetailsSheet
      lesson={lesson}
      role="admin"
      onClose={onClose}
      hereStudentId={hereStudentId}
      actions={(l) => (
        <JoinAround lesson={l}>
          <LessonRowActions
            lesson={l}
            action={action}
            onReschedule={setMoving}
            onEditTime={setEditing}
            onLeave={onClose}
          />
        </JoinAround>
      )}
      sheets={
        <>
          <RescheduleSheet lesson={moving} onClose={() => setMoving(null)} />
          <EditTimeSheet lesson={editing} onClose={() => setEditing(null)} />
        </>
      }
    />
  );
}
