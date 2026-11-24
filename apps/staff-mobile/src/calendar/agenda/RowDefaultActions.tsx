import type { LessonView } from '@ab/schedule';
import { editMode } from '@/edit-time/lib/types';
import { t, Button } from '@ab/mobile-kit';
import { studentNames } from '@/today';
import { ButtonRow } from '@/core/ui/actions';
import { canReschedule } from './can-reschedule';

interface RowDefaultActionsProps {
  lesson: LessonView;
  onReschedule: (lesson: LessonView) => void;
  onEditTime?: ((lesson: LessonView) => void) | undefined;
}

/** Used when the screen gives no actions of its own; docs/07 §6 equal secondary buttons. */
export function RowDefaultActions({ lesson, onReschedule, onEditTime }: RowDefaultActionsProps) {
  const move = canReschedule(lesson);
  const edit = onEditTime && editMode(lesson) ? onEditTime : null;
  if (!move && !edit) return null;
  return (
    <ButtonRow>
      {edit ? (
        <Button
          variant="secondary"
          label={t.editTime.action}
          accessibilityLabel={`${t.editTime.action} — ${studentNames(lesson)}`}
          onPress={() => edit(lesson)}
        />
      ) : null}
      {move ? (
        <Button
          variant="secondary"
          label={t.lessons.rescheduleSubmit}
          accessibilityLabel={`${t.lessons.rescheduleSubmit} — ${studentNames(lesson)}`}
          onPress={() => onReschedule(lesson)}
        />
      ) : null}
    </ButtonRow>
  );
}
