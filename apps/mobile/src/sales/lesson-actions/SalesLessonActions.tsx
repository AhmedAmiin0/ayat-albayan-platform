import type { SalesScheduleLesson } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { usePermissions } from '@/auth';
import { useNow } from '@/today';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { canChangeLesson } from './lesson-actions-api';
import { SalesCancelLesson } from './SalesCancelLesson';

interface SalesLessonActionsProps {
  lesson: SalesScheduleLesson;
  /** Opens «تغيير الموعد» (the sheet is the screen's, mounted over «تفاصيل الحلقة»). */
  onReschedule: (lesson: SalesScheduleLesson) => void;
}

/**
 * «تغيير الموعد» and «إلغاء الحلقة» in sales' «تفاصيل الحلقة», only on an open lesson of one of her
 * students that has not ended, each behind its own key (docs/16 row 37). Nothing for any other lesson.
 */
export function SalesLessonActions({ lesson, onReschedule }: SalesLessonActionsProps) {
  const can = usePermissions();
  const now = useNow();
  const [cancelling, setCancelling] = useState(false);
  const allowed = canChangeLesson(lesson, { now, can });
  const a = t.sales.lessonActions;
  if (!allowed.reschedule && !allowed.cancel) return null;
  if (cancelling) return <SalesCancelLesson lessonId={lesson.id} onClose={() => setCancelling(false)} />;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {allowed.reschedule ? <Button variant="secondary" label={a.reschedule} onPress={() => onReschedule(lesson)} /> : null}
      {allowed.cancel ? <Button variant="ghost" label={a.cancel} onPress={() => setCancelling(true)} /> : null}
    </View>
  );
}
