import { Link } from '@tanstack/react-router';
import { QueryState } from '@ab/web-kit/components/ui/display/query-state';
import { Skeleton } from '@ab/web-kit/components/ui/display/skeleton';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { KpiTileProps } from './KpiTile.types';

const box = 'grid gap-1 rounded-xs px-3 py-3';

/** One dashboard money number; a link only once the number is in, so the retry is not inside it. */
export function KpiTile<T>({ label, to, query, children }: KpiTileProps<T>) {
  const busy = (
    <div aria-busy="true" className={box}>
      <span className="text-xs text-ink-2">{label}</span>
      <Skeleton className="h-8 w-24" />
    </div>
  );
  return (
    <li>
      <QueryState query={query} loading={busy} errorText={t.finance.kpiFailed.replace('{kpi}', label)}>
        {(data) => (
          <Link to={to} className={`${box} no-underline hover:bg-sunk/75`}>
            <span className="text-xs text-ink-2">{label}</span>
            {children(data)}
          </Link>
        )}
      </QueryState>
    </li>
  );
}
