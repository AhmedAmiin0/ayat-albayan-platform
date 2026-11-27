import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { SlotGridProps } from './SlotGrid.types';
import { SlotDay } from './SlotDay';
import { useSlotGrid } from './use-slot-grid';

/** R-SCH-06, rule 6: a start with conflicts stays pickable but reads busy (R-SCH-04). */
export function SlotGrid({ week, slots, studentTz, value, also, onPick }: SlotGridProps) {
  const { grid } = useSlotGrid({ week, slots, value, also });
  // Container query: 7 columns on a wide page, stacked days inside the narrow lesson drawer.
  return (
    <div role="group" aria-label={t.booking.freeSlots} className="@container">
      <div className="grid gap-x-2 gap-y-3 border-t border-rule pt-3 @[640px]:grid-cols-7">
        {grid.map((day) => (
          <SlotDay key={day.day} day={day} studentTz={studentTz} onPick={onPick} />
        ))}
      </div>
    </div>
  );
}
