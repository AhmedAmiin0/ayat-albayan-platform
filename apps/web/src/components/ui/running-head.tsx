import { formatRunningHead } from '@ab/shared';
import { useEffect, useState, type ReactNode } from 'react';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';
import { cn } from '@/lib/utils';

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

/**
 * docs/07 §7 running head (text-xs ink-3): crumbs at the start; Gregorian · Hijri | Riyadh · Cairo
 * at the end, times in ink-2 600. Clocks hide under 640px (the whole head when there are no
 * crumbs). Deliberately NOT a live region: the minute tick must not be announced (and the page
 * keeps a single role=status).
 */
export function RunningHead({ crumbs }: { crumbs?: ReactNode }) {
  const head = formatRunningHead(useMinuteClock(), locale);
  return (
    <div
      className={cn(
        'flex min-h-[54px] flex-wrap items-center justify-between gap-x-5 gap-y-2 text-xs text-ink-3',
        !crumbs && 'max-sm:hidden',
      )}
    >
      <div className="min-w-0">{crumbs}</div>
      <div className="hidden items-center gap-4 sm:flex">
        <span className="tabular-nums">{head.gregorian}</span>
        <span className="tabular-nums">{head.hijri}</span>
        <i aria-hidden="true" className="h-3.5 w-px bg-rule-strong" />
        <span>
          {t.runningHead.riyadh}
          <b className="ms-1 font-semibold text-ink-2 tabular-nums">{head.riyadhTime}</b>
        </span>
        <span>
          {t.runningHead.cairo}
          <b className="ms-1 font-semibold text-ink-2 tabular-nums">{head.cairoTime}</b>
        </span>
      </div>
    </div>
  );
}
