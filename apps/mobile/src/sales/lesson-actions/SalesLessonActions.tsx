import { isRunningLesson, type SalesScheduleLesson } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { usePermissions } from '@/auth';
import { useJoinOpen } from '@/classroom';
import { useNow } from '@/core/lib/time/use-now';
import { t } from '@/core/lib/i18n/i18n';
import { ButtonRow } from '@/core/ui/actions';
import { Button } from '@/core/ui/primitives/Button';
import { canChangeLesson } from './lesson-actions-api';
import { SalesCancelLesson } from './SalesCancelLesson';
import { SalesConfirmLesson } from './SalesConfirmLesson';

interface SalesLessonActionsProps {
  lesson: SalesScheduleLesson;
  /** Opens «تغيير الموعد» (the sheet is the screen's, mounted over «تفاصيل الحلقة»). */
  onReschedule: (lesson: SalesScheduleLesson) => void;
  /** Set while «تأكيد الحلقة» applies (canSalesConfirm): called once it is confirmed. */
  onConfirmed?: (() => void) | undefined;
}

/**
 * Sales' «تفاصيل الحلقة» actions (docs/07 §6 «الأزرار», docs/16 rows 37, 37b): «تأكيد الحلقة» full width
 * and filled, unless «ادخل الحلقة» is live above it (then outlined: never two filled); then ONE
 * ButtonRow «تغيير الموعد» (secondary) | «إلغاء الحلقة» (danger), on an open lesson that has not ended,
 * each behind its own key. «إلغاء الحلقة» opens its reason form in place of the row and hides «تأكيد الحلقة»
 * until «رجوع»: two «تأكيد…» buttons that do opposite things, the filled one the wrong one, invited a
 * mis-tap that confirms the lesson (UX review 2026-10-29). The form's danger «تأكيد الإلغاء» is its one path.
 */
export function SalesLessonActions({ lesson, onReschedule, onConfirmed }: SalesLessonActionsProps) {
  const can = usePermissions();
  const now = useNow();
  const joinLive = useJoinOpen(lesson) && isRunningLesson(lesson, now);
  const [cancelling, setCancelling] = useState(false);
  const allowed = canChangeLesson(lesson, { now, can });
  const a = t.sales.lessonActions;
  const confirm = (secondary: boolean) =>
    onConfirmed ? <SalesConfirmLesson lessonId={lesson.id} onConfirmed={onConfirmed} secondary={secondary} /> : null;
  const changes = allowed.reschedule || allowed.cancel;
  return (
    <View style={{ gap: 8 }}>
      {cancelling ? null : confirm(joinLive)}
      {changes && cancelling ? <SalesCancelLesson lessonId={lesson.id} onClose={() => setCancelling(false)} /> : null}
      {changes && !cancelling ? (
        <ButtonRow>
          {allowed.reschedule ? <Button variant="secondary" label={a.reschedule} onPress={() => onReschedule(lesson)} /> : null}
          {allowed.cancel ? <Button variant="danger" label={a.cancel} onPress={() => setCancelling(true)} /> : null}
        </ButtonRow>
      ) : null}
    </View>
  );
}
