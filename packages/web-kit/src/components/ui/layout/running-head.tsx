import { formatRunningHead } from '@ab/time';
import { useEffect, useState, type ReactNode } from 'react';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { locale } from '@ab/web-kit/lib/i18n/locale';
import { cn } from '@ab/web-kit/lib/utils';
import { useClock } from '@ab/web-kit/lib/clock';

/** Current time, re-rendered on every minute boundary. */
export function useMinuteClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;
    const schedule = () => {
      id = setTimeout(() => {
        setNow(new Date());
        schedule();
      }, 60_000 - (Date.now() % 60_000));
    };
    schedule();
    return () => clearTimeout(id);
  }, []);
  return now;
}

type Layout = 'wrap' | 'fit' | 'inline';

const ROW: Record<Layout, string> = {
  wrap: '',
  fit: '@container shell:flex-nowrap',
  inline: 'min-h-0 flex-nowrap whitespace-nowrap',
};
const END: Record<Layout, string> = { wrap: '', fit: 'shrink-0 whitespace-nowrap', inline: '' };
const DATES: Record<Layout, string> = {
  wrap: 'hidden sm:flex',
  fit: 'hidden sm:max-shell:flex @5xl:flex',
  inline: 'hidden sm:flex',
};
const CITIES: Record<Layout, string> = { ...DATES, fit: 'hidden sm:max-shell:flex @2xl:flex' };
const GAP: Record<Layout, string> = { wrap: 'gap-4', fit: 'gap-4', inline: 'gap-3' };

/**
 * docs/07 §7 running head (text-xs ink-3): crumbs at the start; Gregorian · Hijri | Riyadh · Cairo
 * at the end, times in ink-2 600. Clocks hide under 640px (the whole head when there are no
 * crumbs). Deliberately NOT a live region: the minute tick must not be announced (and the page
 * keeps a single role=status). `end` (the bell) sits after the clocks, at the inline end.
 */
export function RunningHead({
  crumbs,
  end,
  layout = 'wrap',
  className,
}: {
  crumbs?: ReactNode;
  end?: ReactNode;
  /**
   * `fit`: one row from 900px whatever `end` holds: the crumbs truncate and the clocks give way
   * by the row's own width (a sidebar takes 236px), the dates below a 1024px row, the cities
   * below 672px; 640–900px keeps the wrapping row. `inline`: the clocks alone inside a header
   * row, on one line and tighter.
   */
  layout?: Layout;
  className?: string;
}) {
  const head = formatRunningHead(useMinuteClock(), locale, useClock().cycle);
  return (
    <div
      className={cn(
        'flex min-h-[54px] flex-wrap items-center justify-between gap-x-5 gap-y-2 text-xs text-ink-3',
        ROW[layout],
        !crumbs && 'max-sm:hidden',
        className,
      )}
    >
      {crumbs !== undefined && <div className="min-w-0">{crumbs}</div>}
      <div className={cn('ms-auto flex items-center', GAP[layout], END[layout])}>
        <div className={cn('items-center', GAP[layout], DATES[layout])}>
          <span className="tabular-nums">{head.gregorian}</span>
          <span className="tabular-nums">{head.hijri}</span>
          <i aria-hidden="true" className="h-3.5 w-px bg-rule-strong" />
        </div>
        <div className={cn('items-center', GAP[layout], CITIES[layout])}>
          <span>
            {/* academy clocks (docs/34 b): named cities, each labelled, not «the» time */}
            {t.runningHead.riyadh}
            <b className="ms-1 font-semibold text-ink-2 tabular-nums">{head.riyadhTime}</b>
          </span>
          <span>
            {t.runningHead.cairo}
            <b className="ms-1 font-semibold text-ink-2 tabular-nums">{head.cairoTime}</b>
          </span>
        </div>
        {end}
      </div>
    </div>
  );
}
