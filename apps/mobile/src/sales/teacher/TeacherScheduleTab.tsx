import type { SalesTeacherSlot } from '@ab/shared';
import { useClockCycle } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ListRow } from '@/core/ui/layout/ListRow';
import { InsetGroup } from '@/core/ui/surface/inset';
import { slotLine, slotsInWeekOrder, studentsLine } from './overview-text';

/** «الجدول»: one compact row per weekly slot (Riyadh) with its students' names and codes. No link. */
export function TeacherScheduleTab({ weekly }: { weekly: readonly SalesTeacherSlot[] }) {
  const cycle = useClockCycle();
  if (weekly.length === 0) {
    return <EmptyState title={t.sales.teachers.overview.noWeekly} />;
  }
  return (
    <InsetGroup>
      {slotsInWeekOrder(weekly).map((slot) => (
        <ListRow key={`${slot.rule_id}-${slot.weekday}`} title={slotLine(slot, cycle)} subtitle={studentsLine(slot.students)} />
      ))}
    </InsetGroup>
  );
}
