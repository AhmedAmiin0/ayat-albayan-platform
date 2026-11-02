import { applyLessonEvent, type LessonEvent, type LessonView } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { MakeupAction } from '@/booking/makeup/MakeupAction';
import { useJoinOpen } from '@/classroom';
import { FeedbackRequestButton } from '@/feedback/FeedbackRequestButton';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { CancelLesson } from '@/today/components/CancelLesson';
import { studentNames } from '@/today';
import type { useLessonAction } from '@/today/lib/use-lesson-action';
import { Button, type ButtonVariant } from '@/core/ui/primitives/Button';
import { ButtonRow } from '@/core/ui/actions';

interface LessonRowActionsProps {
  lesson: LessonView;
  /** The screen's one confirm / cancel mutation (Today's, R-MOB-03). */
  action: ReturnType<typeof useLessonAction>;
  onReschedule: (lesson: LessonView) => void;
  /** «عدّل الوقت» (R-SCH-11): opens the edit sheet; the button shows when the lesson allows it. */
  onEditTime?: (lesson: LessonView) => void;
  /** Inside the details sheet: closes it before an action navigates away (حجز تعويضي). */
  onLeave?: () => void;
}

/**
 * A «الجدول» row's actions (docs/07 §6 «الأزرار»): «تأكيد» full width, filled while the lesson is
 * still `scheduled` and «ادخل الحلقة» is not live, else outlined (never two filled buttons); then ONE
 * ButtonRow of equal cells: «عدّل الوقت» (this lesson, in place), «غيّر الميعاد» (closes it
 * and opens a new one), «إلغاء» (danger; opens Today's cancel form in place). Each shows only when the API
 * offered it and the state machine still allows it from the status on screen (maybe the optimistic one).
 * A finished lesson also offers «ابعت طلب الرأي» (FeedbackRequestButton).
 */
export function LessonRowActions({ lesson, action, onReschedule, onEditTime, onLeave }: LessonRowActionsProps) {
  const [cancelling, setCancelling] = useState(false);
  const can = (e: LessonEvent) =>
    lesson.allowed_events.includes(e) && applyLessonEvent(lesson.status, e) !== null;
  const busy = action.busyId === lesson.id;
  const error = action.errorFor(lesson.id);
  const who = studentNames(lesson);
  const joinOpen = useJoinOpen(lesson);
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
  const lead = can('confirm') && lesson.status === 'scheduled' && !joinOpen;
  const confirm = () => action.confirm(lesson.id);
  return (
    <View style={{ gap: 8 }}>
      {can('confirm') ? act(t.today.confirm, lead ? 'primary' : 'secondary', confirm) : null}
      <ButtonRow>
        {onEditTime && lesson.time_edit_mode ? act(t.editTime.action, 'secondary', () => onEditTime(lesson)) : null}
        {can('reschedule') ? act(t.lessons.rescheduleSubmit, 'secondary', () => onReschedule(lesson)) : null}
        {can('cancel_by_admin') ? act(t.today.cancel, 'danger', () => setCancelling(true)) : null}
      </ButtonRow>
      <MakeupAction lesson={lesson} onLeave={onLeave} />
      <FeedbackRequestButton lesson={lesson} />
      {error ? <ErrorLine message={error} /> : null}
    </View>
  );
}
