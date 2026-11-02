import { Icon } from '@/components/ui/display/icon';
import { IconButton } from '@/components/ui/form/icon-button';
import { tzCity } from '@/components/ui/form/time-zone-select';
import { t } from '@/lib/i18n/i18n';
import type { DayPick } from '@/features/teaching/booking/draft/draft.days';
import { type Clock, useClock } from '@/lib/clock';
import { useViewerTz } from '@/lib/viewer-tz';
import { clockOfHhmm } from '@ab/shared';

export interface DayTimesListProps {
  /** Each picked day with its time in the family zone (dayPicks), Saturday first. */
  picks: readonly DayPick[];
  /** The family's zone: its city follows the times when it is not the viewer's. */
  tz: string;
  /** Unpicks that day (its instant). */
  onRemove: (at: string) => void;
}

const weekday: Record<string, string> = t.enums.weekday;

/**
 * «الأحد الساعة 17:00» for one picked day on the family's clock `tz`; «… 17:00 بتوقيت القاهرة»
 * when that zone is not the viewer's (`clock.tz`, from useViewerTz()).
 */
export function dayAtText(
  p: Pick<DayPick, 'weekday' | 'time'>,
  clock: Clock & { tz: string },
  tz: string,
): string {
  const at = clockOfHhmm(p.time, clock.cycle, clock.locale);
  const city = tzCity(tz) ?? tz;
  const time = tz === clock.tz ? at : t.schedule.inCity.replace('{time}', at).replace('{city}', city);
  return t.booking.dayAt.replace('{day}', weekday[String(p.weekday)] ?? '').replace('{time}', time);
}

/**
 * The package's picked days, each with its own time (owner 2026-10-18: «اختر موعدًا لكل يوم»),
 * picked on the slot grid above; each removable with its own button (44px touch target).
 */
export function DayTimesList({ picks, tz, onRemove }: DayTimesListProps) {
  const clock = { ...useClock(), tz: useViewerTz() };
  if (picks.length === 0) return <p className="text-xs text-ink-3">{t.booking.noDayPicked}</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {picks.map((p) => {
        const day = weekday[String(p.weekday)] ?? '';
        return (
          <li key={p.at} className="flex items-center gap-1 rounded-md border border-rule bg-raised ps-3 text-sm">
            <span className="tabular-nums">{dayAtText(p, clock, tz)}</span>
            <IconButton label={t.booking.removeDay.replace('{day}', day)} className="sm:size-11" onClick={() => onRemove(p.at)}>
              <Icon name="x" />
            </IconButton>
          </li>
        );
      })}
    </ul>
  );
}
