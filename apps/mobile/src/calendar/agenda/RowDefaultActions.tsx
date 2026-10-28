import type { LessonView } from '@ab/shared';
import { EditTimeButton } from '@/edit-time/components/EditTimeButton';
import { editMode } from '@/edit-time/lib/types';
import { t } from '@/core/lib/i18n/i18n';
import { studentNames } from '@/today/lib/lesson-text';
import { Button } from '@/core/ui/primitives/Button';
import { ButtonRow } from '@/core/ui/actions';
import { canReschedule } from './can-reschedule';

interface RowDefaultActionsProps {
  lesson: LessonView;
  onReschedule: (lesson: LessonView) => void;
  onEditTime?: ((lesson: LessonView) => void) | undefined;
}

/**
 * An agenda row's actions when the screen gives none of its own (a teacher's calendar): one ButtonRow,
 * «عدّل الوقت» | «غيّر الميعاد», both secondary and equal width (docs/07 §6), each only when the lesson
 * allows it. Nothing otherwise.
 */
export function RowDefaultActions({ lesson, onReschedule, onEditTime }: RowDefaultActionsProps) {
  const move = canReschedule(lesson);
  const edit = onEditTime && editMode(lesson) ? onEditTime : null;
  if (!move && !edit) return null;
  return (
    <ButtonRow>
      {edit ? <EditTimeButton lesson={lesson} onPress={() => edit(lesson)} /> : null}
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
