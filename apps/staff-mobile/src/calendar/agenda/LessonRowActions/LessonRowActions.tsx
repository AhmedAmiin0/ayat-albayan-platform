import {
  applyLessonEvent,
  correctionTargets,
  type CorrectTo,
  type LessonEvent,
  type LessonView,
} from '@ab/schedule';
import { useState } from 'react';
import { View } from 'react-native';
import { MakeupAction } from '@/booking/makeup/MakeupAction';
import { useJoinOpen } from '@/classroom';
import { CorrectOutcome } from '@/teaching';
import { usePermissions, t, Button, type ButtonVariant, useNow, ErrorLine } from '@ab/mobile-kit';
import { FeedbackRequestButton } from '@/feedback/FeedbackRequestButton';
import { CancelLesson } from '@/today/components/CancelLesson';
import { studentNames } from '@/today';
import type { useLessonAction } from '@/today/lib/use-lesson-action';
import { ButtonRow } from '@/core/ui/actions';
import { useLessonStatusText } from '@/core/ui/feedback/lesson-status';

interface RowCorrectionProps {
  lesson: LessonView;
  action: ReturnType<typeof useLessonAction>;
  busy: boolean;
}

/** Nothing when no correction applies. */
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
  /** R-SCH-11: shown when the lesson allows it. */
  onEditTime?: (lesson: LessonView) => void;
  /** Inside the details sheet: closes it before an action navigates away. */
  onLeave?: () => void;
}

/** docs/07 §6: each action shows only when the API offered it and the state machine allows it. */
export function LessonRowActions({ lesson, action, onReschedule, onEditTime, onLeave }: LessonRowActionsProps) {
  const [cancelling, setCancelling] = useState(false);
  const can = (e: LessonEvent) =>
    lesson.allowed_events.includes(e) && applyLessonEvent(lesson.status, e) !== null;
  const busy = action.busyId === lesson.id;
  const error = action.errorFor(lesson.id);
  const who = studentNames(lesson);
  const joinOpen = useJoinOpen(lesson);
  // Confirm exists only while lesson_confirmation_required is on.
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
