import type { LessonView } from '@ab/shared';
import { View } from 'react-native';
import { EditTimeButton } from '@/edit-time/components/EditTimeButton';
import { editMode } from '@/edit-time/lib/types';
import { t } from '@/core/lib/i18n/i18n';
import { studentNames } from '@/today/lib/lesson-text';
import { Button } from '@/core/ui/primitives/Button';
import { canReschedule } from './can-reschedule';

export interface RowDefaultActionsProps {
  lesson: LessonView;
  onReschedule: (lesson: LessonView) => void;
  onEditTime?: ((lesson: LessonView) => void) | undefined;
}

/**
 * An agenda row's actions when the screen gives none of its own (a teacher's calendar): «عدّل الوقت»
 * (secondary) before the ghost «غيّر الميعاد», each only when the lesson allows it. Nothing otherwise.
 */
export function RowDefaultActions({ lesson, onReschedule, onEditTime }: RowDefaultActionsProps) {
  const move = canReschedule(lesson);
  if (!move && !(onEditTime && editMode(lesson))) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignSelf: 'flex-start', gap: 8 }}>
      {onEditTime ? <EditTimeButton lesson={lesson} onPress={() => onEditTime(lesson)} /> : null}
      {move ? (
        <Button
          variant="ghost"
          label={t.lessons.rescheduleSubmit}
          accessibilityLabel={`${t.lessons.rescheduleSubmit} — ${studentNames(lesson)}`}
          onPress={() => onReschedule(lesson)}
        />
      ) : null}
    </View>
  );
}
