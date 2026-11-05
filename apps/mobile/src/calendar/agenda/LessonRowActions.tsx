import {
  applyLessonEvent,
  correctionTargets,
  type CorrectTo,
  type LessonEvent,
  type LessonView,
} from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { MakeupAction } from '@/booking/makeup/MakeupAction';
import { useJoinOpen } from '@/classroom';
import { CorrectOutcome } from '@/teaching';
import { useNow } from '@/core/lib/time/use-now';
import { usePermissions } from '@/core/auth';
import { FeedbackRequestButton } from '@/feedback/FeedbackRequestButton';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { CancelLesson } from '@/today/components/CancelLesson';
import { studentNames } from '@/today';
import type { useLessonAction } from '@/today/lib/use-lesson-action';
import { Button, type ButtonVariant } from '@/core/ui/primitives/Button';
import { ButtonRow } from '@/core/ui/actions';
import { useLessonStatusText } from '@/core/ui/feedback/lesson-status';

interface RowCorrectionProps {
  lesson: LessonView;
  action: ReturnType<typeof useLessonAction>;
  busy: boolean;
}

/** «تصحيح حالة الحلقة» for staff who edit lessons (owner 2026-11-03); nothing when none applies. */
function RowCorrection({ lesson, action, busy }: RowCorrectionProps) {
  const now = useNow();
  const staff = usePermissions()('lessons.write');
  const auto = lesson.auto_held === true;
  const targets = staff ? correctionTargets({ ...lesson, auto }, now) : [];
  const onCorrect = (to: CorrectTo) => action.correct(lesson.id, to);
  if (targets.length === 0) return null;
  return <CorrectOutcome targets={targets} onCorrect={onCorrect} busy={busy} />;
}

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
  // «تأكيد» only while the academy requires a confirmation (settings.lesson_confirmation_required);
  const { required } = useLessonStatusText();
  const confirmable = required && can('confirm');

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
  const lead = confirmable && lesson.status === 'scheduled' && !joinOpen;
  const confirm = () => action.confirm(lesson.id);
  return (
    <View style={{ gap: 8 }}>
      {confirmable ? act(t.today.confirm, lead ? 'primary' : 'secondary', confirm) : null}
      <ButtonRow>
        {onEditTime && lesson.time_edit_mode ? act(t.editTime.action, 'secondary', () => onEditTime(lesson)) : null}
        {can('reschedule') ? act(t.lessons.rescheduleSubmit, 'secondary', () => onReschedule(lesson)) : null}
        {can('cancel_by_admin') ? act(t.today.cancel, 'danger', () => setCancelling(true)) : null}
      </ButtonRow>
      <RowCorrection lesson={lesson} action={action} busy={busy} />
      <MakeupAction lesson={lesson} onLeave={onLeave} />
      <FeedbackRequestButton lesson={lesson} />
      {error ? <ErrorLine message={error} /> : null}
    </View>
  );
}
