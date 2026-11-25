import type { SalesTeacherSlot } from '@ab/shared';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { t, EmptyState, ListRow, InsetGroup } from '@ab/mobile-kit';
import { slotLine, slotsInWeekOrder, studentsLine } from './overview-text';

/** No link. */
export function TeacherScheduleTab({ weekly }: { weekly: readonly SalesTeacherSlot[] }) {
  const cycle = useClockCycle();
  const tz = useViewerTz();
  if (weekly.length === 0) {
    return <EmptyState title={t.sales.teachers.overview.noWeekly} />;
  }
  return (
    <InsetGroup>
      {slotsInWeekOrder(weekly, tz).map((slot) => (
        <ListRow key={`${slot.rule_id}-${slot.weekday}`} title={slotLine(slot, cycle, tz)} subtitle={studentsLine(slot.students)} />
      ))}
    </InsetGroup>
  );
}
