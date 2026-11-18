import { dateText } from '@ab/shared';
import { locale } from '@ab/web-kit/lib/i18n/locale';

interface Props {
  /** The lesson's start (an ISO instant). */
  at: string;
  /** The family's zone: the day the tile shows. */
  tz: string;
}

/**
 * The boards' date tile at a past lesson's or a recording's start: the weekday over the day's
 * number on the mint wash. Decorative (the row says the date in words) and family only: a shared
 * panel renders it hidden, so the staff pages never show it.
 */
export function DateTile({ at, tz }: Props) {
  const when = new Date(at);
  const opts = { tz, locale };
  return (
    <span
      aria-hidden="true"
      className="hidden size-[58px] shrink-0 flex-col items-center justify-center rounded-[14px]
        bg-lapis-wash text-lapis family:flex"
    >
      <span className="text-xs font-bold leading-[1.4]">
        {dateText(when, opts, { weekday: 'long' })}
      </span>
      <span className="text-[20px] font-extrabold leading-tight text-ink">
        {dateText(when, opts, { day: 'numeric' })}
      </span>
    </span>
  );
}
