import { dateText } from '@ab/shared';
import { locale } from '@ab/web-kit/lib/i18n/locale';

const WEEKDAY = { weekday: 'long' } as const;
const DAY = { day: 'numeric' } as const;

/**
 * The mint date tile at a row's start (boards: a report's day): the weekday over the day number,
 * on `tz`'s calendar. Decorative: the row says its date in words.
 */
export function DateTile({ at, tz }: { at: Date; tz: string }) {
  const clock = { tz, locale };
  return (
    <span
      aria-hidden="true"
      className="grid size-[58px] shrink-0 place-content-center justify-items-center rounded-[14px]
        bg-fam-mint text-fam-mint-ink"
    >
      <span className="text-xs font-bold leading-snug">{dateText(at, clock, WEEKDAY)}</span>
      <span className="text-[20px] font-extrabold leading-tight text-ink">
        {dateText(at, clock, DAY)}
      </span>
    </span>
  );
}
