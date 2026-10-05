import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { kpisOf, type Kpi } from './kpis';
import type { WorkTab } from './search';
import type { DashboardData } from './types';

export interface KpiStripProps {
  /** undefined while loading: the tiles show a dash, never a made-up number. */
  summary: DashboardData | undefined;
  /** The queue shown under the strip (aria-current on its tile). */
  work: WorkTab;
}

const tile =
  'ab-lift flex h-full flex-col gap-1.5 rounded-md px-3 py-3 no-underline hover:bg-sunk/75';

function Figure({ kpi, loading }: { kpi: Kpi; loading: boolean }): ReactNode {
  return (
    <>
      <span
        data-act={kpi.act || undefined}
        className={cn('font-display text-[28px] leading-none font-bold', loading ? 'text-ink-3' : kpi.act ? 'text-act' : 'text-ink')}
      >
        {loading ? '—' : kpi.value}
      </span>{' '}
      <span className="text-xs text-ink-2">{kpi.label}</span>
    </>
  );
}

/**
 * The work column's switcher (docs/07 §6): four counts in a 2×2 grid, Western digits; each a
 * filter link: «يحتاج تأكيد» opens the schedule filtered to it, the other three pick the queue below.
 */
export function KpiStrip({ summary, work }: KpiStripProps) {
  const counts = summary ?? { needs_confirmation: 0, pending_reports: 0, unpaid_subscriptions: 0, open_tasks: 0 };
  const kpis = kpisOf(counts);
  return (
    <nav aria-label={t.dashboard.kpiStrip} className="border-y border-rule py-1.5">
      <ul className="grid grid-cols-2 gap-1">
        {kpis.map((k) => (
          <li key={k.key}>
            {k.key === 'needsConfirm' ? (
              <Link to="/admin/schedule" search={{ status: 'scheduled' }} className={tile}>
                <Figure kpi={k} loading={!summary} />
              </Link>
            ) : (
              <Link
                to="/admin"
                search={(prev) => ({ ...prev, work: k.key === 'reports' ? undefined : (k.key as WorkTab) })}
                // exact: the reports tile ({} search) must not count as active on ?work=tasks.
                activeOptions={{ exact: true, includeSearch: true }}
                aria-current={work === k.key ? 'true' : undefined}
                className={cn(tile, work === k.key && 'bg-gold-wash/60 hover:bg-gold-wash/60')}
              >
                <Figure kpi={k} loading={!summary} />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
