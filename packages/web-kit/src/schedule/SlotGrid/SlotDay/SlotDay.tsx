import { SlotButton } from '@ab/web-kit/schedule/SlotGrid/SlotButton';
import type { SlotDayProps } from './SlotDay.types';

/** One day column: its starts, or a dash when it has none. */
export function SlotDay({ day, studentTz, onPick }: SlotDayProps) {
  return (
    <section aria-label={day.label} className="min-w-0">
      <h4 className="mb-1.5 text-xs font-semibold text-ink-2">{day.label}</h4>
      {day.slots.length === 0 ? (
        <p aria-hidden="true" className="text-xs text-ink-3">
          —
        </p>
      ) : (
        // Wide: the columns grow; the page or dialog body is the one scroller (docs/66 §1);
        // the padding keeps the picked ring and focus outline clear of the next column.
        <ul className="flex flex-wrap gap-1.5 @[640px]:grid @[640px]:p-0.5">
          {day.slots.map(({ slot, picked }) => (
            <li key={slot.starts_at}>
              <SlotButton slot={slot} studentTz={studentTz} picked={picked} onPick={onPick} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
