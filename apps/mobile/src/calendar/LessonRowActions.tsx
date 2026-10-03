import { applyLessonEvent, type LessonEvent, type LessonView } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/lib/i18n';
import { CancelLesson } from '@/today/CancelLesson';
import { studentNames } from '@/today/lesson-text';
import type { useLessonAction } from '@/today/use-lesson-action';
import { Button, type ButtonVariant } from '@/ui/Button';

export interface LessonRowActionsProps {
  lesson: LessonView;
  /** The screen's one confirm / cancel mutation (Today's, R-MOB-03). */
  action: ReturnType<typeof useLessonAction>;
  onReschedule: (lesson: LessonView) => void;
}

/**
 * A «الجدول» row's actions, in view under the line (docs/07 §6): «تأكيد» (filled only while the
 * lesson is still `scheduled`: the one thing it waits for), «إلغاء» (secondary; opens Today's
 * cancel form in place) and «غيّر الميعاد» (ghost), each only when the API offered it and the
 * state machine still allows it from the status on screen (maybe already the optimistic one).
 */
export function LessonRowActions({ lesson, action, onReschedule }: LessonRowActionsProps) {
  const [cancelling, setCancelling] = useState(false);
  const can = (e: LessonEvent) =>
    lesson.allowed_events.includes(e) && applyLessonEvent(lesson.status, e) !== null;
  const busy = action.busyId === lesson.id;
  const error = action.errorFor(lesson.id);
  const who = studentNames(lesson);
  const act = (label: string, variant: ButtonVariant, onPress: () => void) => (
    <Button
      variant={variant}
      label={label}
      accessibilityLabel={`${label} — ${who}`}
      busy={busy}
      onPress={onPress}
    />
  );
  if (cancelling && can('cancel_by_admin')) {
    return (
      <CancelLesson
        lesson={lesson}
        onSubmit={(cancel) => action.cancel(lesson.id, cancel)}
        onClose={() => setCancelling(false)}
      />
    );
  }
  return (
    <View style={{ gap: 2 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignSelf: 'flex-start', gap: 8 }}>
        {can('confirm') ? act(t.today.confirm, lesson.status === 'scheduled' ? 'primary' : 'ghost', () => action.confirm(lesson.id)) : null}
        {can('cancel_by_admin') ? act(t.today.cancel, 'secondary', () => setCancelling(true)) : null}
        {can('reschedule') ? act(t.lessons.rescheduleSubmit, 'ghost', () => onReschedule(lesson)) : null}
      </View>
      {error ? <ErrorLine message={error} /> : null}
    </View>
  );
}
