import { t } from '@/lib/i18n';
import { studentNames } from '@/today/lesson-text';
import { Button } from '@/ui/Button';
import { editMode, type EditableLesson } from './types';

export interface EditTimeButtonProps {
  lesson: EditableLesson;
  onPress: () => void;
  busy?: boolean;
}

/**
 * The secondary «عدّل الوقت» beside the ghost «غيّر الميعاد» on a lesson row: a bordered button
 * (edit this lesson in place) against plain text (close it and open a new one). Shows only when
 * the API offered the edit (`time_edit_mode`: admin, a scheduled / confirmed / held lesson), so a
 * teacher, an old cache and a cancelled lesson never see it. The spoken name carries the students,
 * as the other row actions do.
 */
export function EditTimeButton({ lesson, onPress, busy = false }: EditTimeButtonProps) {
  if (editMode(lesson) === null) return null;
  return (
    <Button
      variant="secondary"
      label={t.editTime.action}
      accessibilityLabel={`${t.editTime.action} — ${studentNames(lesson)}`}
      busy={busy}
      onPress={onPress}
    />
  );
}
