import { isRunningLesson, type SalesScheduleLesson } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { usePermissions, t, Button, useNow } from '@ab/mobile-kit';
import { useJoinOpen } from '@/classroom';
import { ButtonRow } from '@/core/ui/actions';
import { useLessonStatusText } from '@/core/ui/feedback/lesson-status';
import { salesCancelRights } from '@/sales/sales/lesson-actions/cancel-by';
import { canChangeLesson } from '@/sales/sales/lesson-actions/lesson-actions-api';
import { SalesCancelLesson } from '@/sales/sales/lesson-actions/SalesCancelLesson';
import { SalesConfirmLesson } from '@/sales/sales/lesson-actions/SalesConfirmLesson';
import { SalesCorrectOutcome } from '@/sales/sales/lesson-actions/SalesCorrectOutcome';

interface SalesLessonActionsProps {
  lesson: SalesScheduleLesson;
  /** The reschedule sheet belongs to the screen, mounted over the lesson details. */
  onReschedule: (lesson: SalesScheduleLesson) => void;
  /** Set while confirming applies; called once it is confirmed. */
  onConfirmed?: (() => void) | undefined;
}

/** Never two filled buttons (docs/07 §6); cancel hides confirm to avoid a mis-tap. */
export function SalesLessonActions({ lesson, onReschedule, onConfirmed }: SalesLessonActionsProps) {
  const can = usePermissions();
  const now = useNow();
  const joinLive = useJoinOpen(lesson) && isRunningLesson(lesson, now);
  const [cancelling, setCancelling] = useState(false);
  const { required } = useLessonStatusText();
  const reschedule = canChangeLesson(lesson, { now, can }).reschedule;
  const rights = salesCancelRights(lesson, { now, holds: can('lessons.cancel'), required });
  const cancel = rights.cancelBy.length > 0;
  const a = t.sales.lessonActions;
  const confirm = (secondary: boolean) =>
    onConfirmed ? (
      <SalesConfirmLesson lessonId={lesson.id} onConfirmed={onConfirmed} secondary={secondary} />
    ) : null;
  const changes = reschedule || cancel;
  return (
    <View style={{ gap: 8 }}>
      {cancelling ? null : confirm(joinLive)}
      {changes && cancelling ? (
        <SalesCancelLesson
          lessonId={lesson.id}
          choices={rights.cancelBy}
          onClose={() => setCancelling(false)}
        />
      ) : null}
      {changes && !cancelling ? (
        <ButtonRow>
          {reschedule ? <Button variant="secondary" label={a.reschedule} onPress={() => onReschedule(lesson)} /> : null}
          {cancel ? <Button variant="danger" label={a.cancel} onPress={() => setCancelling(true)} /> : null}
        </ButtonRow>
      ) : null}
      {rights.correct.length > 0 ? (
        <SalesCorrectOutcome lessonId={lesson.id} targets={rights.correct} />
      ) : null}
    </View>
  );
}
