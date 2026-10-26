import { applyLessonEvent, type LessonEvent, type LessonView } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { MakeupAction } from '@/booking/makeup/MakeupAction';
import { EditTimeButton } from '@/edit-time/components/EditTimeButton';
import { FeedbackRequestButton } from '@/feedback/FeedbackRequestButton';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { CancelLesson } from '@/today/CancelLesson';
import { studentNames } from '@/today/lesson-text';
import type { useLessonAction } from '@/today/use-lesson-action';
import { Button, type ButtonVariant } from '@/core/ui/primitives/Button';

export interface LessonRowActionsProps {
  lesson: LessonView;
  /** The screen's one confirm / cancel mutation (Today's, R-MOB-03). */
  action: ReturnType<typeof useLessonAction>;
  onReschedule: (lesson: LessonView) => void;
  /** «عدّل الوقت» (R-SCH-11): opens the edit sheet; the button shows when the lesson allows it. */
  onEditTime?: (lesson: LessonView) => void;
}

/**
 * A «الجدول» row's actions, in view under the line (docs/07 §6): «تأكيد» (filled only while the
 * lesson is still `scheduled`: the one thing it waits for), «إلغاء» (secondary; opens Today's
 * cancel form in place), «عدّل الوقت» (secondary: this lesson, in place) and «غيّر الميعاد» (ghost:
 * closes it and opens a new one), each only when the API offered it and the state machine still
 * allows it from the status on screen (maybe already the optimistic one).
 * A finished lesson also offers «ابعت طلب الرأي» (FeedbackRequestButton).
 */
export function LessonRowActions({ lesson, action, onReschedule, onEditTime }: LessonRowActionsProps) {
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
        {onEditTime ? <EditTimeButton lesson={lesson} busy={busy} onPress={() => onEditTime(lesson)} /> : null}
        {can('reschedule') ? act(t.lessons.rescheduleSubmit, 'ghost', () => onReschedule(lesson)) : null}
      </View>
      <MakeupAction lesson={lesson} />
      <FeedbackRequestButton lesson={lesson} />
      {error ? <ErrorLine message={error} /> : null}
    </View>
  );
}
