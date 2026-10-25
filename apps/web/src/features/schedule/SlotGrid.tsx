import type { SlotView } from '@ab/shared';
import { clockTime } from '@ab/shared';
import { NuqtaGlyph } from '@/components/ui/display/nuqta-glyph';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { byLocalDay, zoneLabel } from './slots';
import { dayMonthLabel, RIYADH_TZ, weekDays, weekdayOf } from './tz';

export interface SlotGridProps {
  /** Saturday of the Riyadh week shown. */
  week: string;
  slots: readonly SlotView[];
  /** Zone of the small times under each slot (the student's). */
  studentTz: string;
  /** starts_at of the picked slot. */
  value: string | null;
  /** A package's other picked starts (one per weekday, owner 2026-10-18): shown picked too. */
  also?: readonly string[] | undefined;
  onPick: (slot: SlotView) => void;
}

const weekday: Record<string, string> = t.enums.weekday;

/**
 * The teacher's candidate starts as 7 Riyadh day columns (R-SCH-06). Times are picked, never
 * typed (rule 6). A start with conflicts stays pickable but reads «مش فاضي» (struck nuqta): booking
 * it shows the conflict and the book-anyway path (R-SCH-04).
 */
export function SlotGrid({ week, slots, studentTz, value, also = [], onPick }: SlotGridProps) {
  const days = byLocalDay(slots, RIYADH_TZ);
  // Container query: 7 columns on a wide page, stacked days inside the narrow lesson drawer.
  return (
    <div role="group" aria-label={t.booking.freeSlots} className="@container">
      <div className="grid gap-x-2 gap-y-3 border-t border-rule pt-3 @[640px]:grid-cols-7">
        {weekDays(week).map((day) => {
          const daySlots = days.get(day) ?? [];
          const label = `${weekday[String(weekdayOf(day))] ?? ''} ${dayMonthLabel(day)}`;
          return (
            <section key={day} aria-label={label} className="min-w-0">
              <h4 className="mb-1.5 text-xs font-semibold text-ink-2">{label}</h4>
              {daySlots.length === 0 ? (
                <p aria-hidden="true" className="text-xs text-ink-3">—</p>
              ) : (
                // Wide: each day column scrolls past ~9 starts (48 a day while teachers are 24/7);
                // the padding keeps the picked ring and focus outline inside the scroll box.
                <ul className="flex flex-wrap gap-1.5 @[640px]:grid @[640px]:max-h-[26rem] @[640px]:overflow-y-auto @[640px]:p-0.5">
                  {daySlots.map((slot) => (
                    <li key={slot.starts_at}>
                      <SlotButton
                        slot={slot}
                        studentTz={studentTz}
                        picked={slot.starts_at === value || also.includes(slot.starts_at)}
                        onPick={onPick}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

interface SlotButtonProps {
  slot: SlotView;
  studentTz: string;
  picked: boolean;
  onPick: (slot: SlotView) => void;
}

function SlotButton({ slot, studentTz, picked, onPick }: SlotButtonProps) {
  const busy = slot.conflicts.length > 0;
  const small = zoneLabel(slot.starts_at, { tz: studentTz, base: RIYADH_TZ });
  return (
    <button
      type="button"
      aria-pressed={picked}
      onClick={() => onPick(slot)}
      className={cn(
        'grid min-h-11 w-full min-w-[76px] content-center justify-items-center rounded-md border px-2 py-1 text-sm tabular-nums transition-colors duration-[120ms] sm:min-h-10',
        picked
          ? 'border-lapis bg-accent font-semibold text-ink shadow-[0_0_0_2px_color-mix(in_oklab,var(--lapis)_22%,transparent)]'
          : busy
            ? 'border-dashed border-rule-strong text-ink-3 hover:bg-sunk'
            : 'border-input bg-raised text-ink hover:bg-sunk',
      )}
    >
      <span className="flex items-center gap-1">
        {busy && <NuqtaGlyph shape="struck" />}
        <span dir="ltr">{clockTime(new Date(slot.starts_at), RIYADH_TZ)}</span>
      </span>
      {small && <span className="text-2xs text-ink-3">{small}</span>}
      {busy && <span className="text-2xs text-ink-3">{t.booking.slotBusy}</span>}
    </button>
  );
}
