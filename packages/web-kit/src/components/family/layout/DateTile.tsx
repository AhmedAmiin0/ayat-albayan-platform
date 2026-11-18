import { dateText } from '@ab/shared';
import { locale } from '@ab/web-kit/lib/i18n/locale';
import { cn } from '@ab/web-kit/lib/utils';

const WEEKDAY = { weekday: 'long' } as const;
const DAY = { day: 'numeric' } as const;

interface Props {
  /** The day shown (an ISO instant or a Date). */
  at: string | Date;
  /** The family's zone: the calendar the tile reads. */
  tz: string;
  /**
   * Inside a panel the staff pages share: hidden there, shown only under the family skin
   * (`family:grid`), so the staff look never changes.
   */
  familyOnly?: boolean;
}

/**
 * The boards' mint date tile at a row's or card's start: the weekday over the day's number, on
 * `tz`'s calendar. Decorative: the row or heading says its date in words.
 */
export function DateTile({ at, tz, familyOnly = false }: Props) {
  const when = new Date(at);
  const clock = { tz, locale };
  return (
    <span
      aria-hidden="true"
      className={cn(
        'size-[58px] shrink-0 place-content-center justify-items-center rounded-[14px] bg-fam-mint',
        'text-fam-mint-ink',
        familyOnly ? 'hidden family:grid' : 'grid',
      )}
    >
      <span className="text-xs font-bold leading-snug">{dateText(when, clock, WEEKDAY)}</span>
      <span className="text-xl font-extrabold leading-tight text-ink">
        {dateText(when, clock, DAY)}
      </span>
    </span>
  );
}
