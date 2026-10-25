import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/display/skeleton';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export interface TodayKpisProps {
  /** Today's lessons and how many rooms are open now; undefined while the day loads. */
  today: { lessons: number; live: number } | undefined;
  /** From GET /dashboard/summary (this week); undefined while it loads. */
  needsConfirmation: number | undefined;
  unpaid: number | undefined;
}

const tile =
  'ab-lift grid content-between gap-2 rounded-md border border-rule bg-page p-4 no-underline min-h-[104px] hover:bg-sunk/60';

function Tile({ value, label, act, live }: { value: number | undefined; label: string; act?: boolean; live?: boolean }): ReactNode {
  return (
    <>
      <span className="flex items-center gap-2 text-sm text-ink-2">
        {live && value !== undefined && value > 0 && (
          <span aria-hidden="true" className="size-2 rounded-full bg-ok motion-safe:animate-pulse" />
        )}
        {label}
      </span>{' '}
      {value === undefined ? (
        <Skeleton className="h-8 w-12" />
      ) : (
        <span className={cn('text-[32px] leading-none font-bold tabular-nums', act && value > 0 ? 'text-act' : 'text-ink')}>{value}</span>
      )}
    </>
  );
}

/**
 * The dashboard's first row (owner, 2026-10-05): four numbers the API already gives. Lessons today
 * and open now come from the day's lessons; «يحتاج تأكيد» and unpaid packages from the summary.
 * Each tile is a link to the work behind it. Saffron only where there is work waiting.
 */
export function TodayKpis({ today, needsConfirmation, unpaid }: TodayKpisProps) {
  return (
    <section aria-label={t.dashboard.home.today}>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <li>
          <Link to="/admin/classrooms" className={tile}>
            <Tile value={today?.lessons} label={t.dashboard.home.lessonsToday} />
          </Link>
        </li>
        <li>
          <Link to="/admin/classrooms" className={tile}>
            <Tile value={today?.live} label={t.dashboard.home.openNow} live />
          </Link>
        </li>
        <li>
          <Link to="/admin/schedule" search={{ status: 'scheduled' }} className={tile}>
            <Tile value={needsConfirmation} label={t.enums.lessonStatus.scheduled} act />
          </Link>
        </li>
        <li>
          <Link to="/admin" search={(prev) => ({ ...prev, work: 'unpaid' })} className={tile}>
            <Tile value={unpaid} label={t.dashboard.unpaidSubscriptions} act />
          </Link>
        </li>
      </ul>
    </section>
  );
}
