import type { SalesTeacherSlot } from '@ab/shared';
import { View } from 'react-native';
import { useClockCycle } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ListRow } from '@/core/ui/layout/ListRow';
import { slotLine, slotsInWeekOrder, studentsLine } from './overview-text';

/** «الجدول»: one compact row per weekly slot (Riyadh) with its students' names and codes. No link. */
export function TeacherScheduleTab({ weekly }: { weekly: readonly SalesTeacherSlot[] }) {
  const cycle = useClockCycle();
  if (weekly.length === 0) {
    return (
      <View style={{ paddingHorizontal: 16 }}>
        <EmptyState title={t.sales.teachers.overview.noWeekly} />
      </View>
    );
  }
  return (
    <>
      {slotsInWeekOrder(weekly).map((slot) => (
        <ListRow key={`${slot.rule_id}-${slot.weekday}`} title={slotLine(slot, cycle)} subtitle={studentsLine(slot.students)} />
      ))}
    </>
  );
}
