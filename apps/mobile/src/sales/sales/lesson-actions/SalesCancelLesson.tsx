import { View } from 'react-native';
import { ErrorLine } from '@/inbox';
import { t } from '@/core/lib/i18n/i18n';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { Note } from '@/more';
import { rescheduleFailure } from '@/teaching';
import { CancelLesson } from '@/today';
import { useSalesCancel } from './lesson-actions-api';

/** One lesson, never a series (POST /sales/lessons/:id/cancel is strict): no «كل اللي بعدها». */
const ONE_LESSON = { rule_id: null };

/**
 * Sales' «إلغاء الحلقة» (docs/16 row 37; owner 2026-11-02 «I want assistant to be able to
 * cancel»): the admin's very form (CancelLesson): who cancelled (teacher / student / academy,
 * which sets the status and whether the lesson counts, as for the admin) and the reason. This
 * lesson only.
 */
export function SalesCancelLesson({ lessonId, onClose }: { lessonId: string; onClose: () => void }) {
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const cancel = useSalesCancel(lessonId);
  if (cancel.isSuccess) return <Note>{t.sales.lessonActions.cancelled}</Note>;
  const failure = cancel.isError ? rescheduleFailure(cancel.error, cycle, tz) : null;
  return (
    <View style={{ gap: 10 }}>
      {failure ? <ErrorLine message={failure.kind === 'error' ? failure.text : t.common.error} /> : null}
      <CancelLesson
        lesson={ONE_LESSON}
        busy={cancel.isPending}
        onSubmit={({ by, reason }) => cancel.mutate({ by, reason })}
        onClose={onClose}
      />
    </View>
  );
}
