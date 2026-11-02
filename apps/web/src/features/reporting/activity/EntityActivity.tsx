import { useQuery } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { StatusChip } from '@/components/ui/display/status-chip';
import { Pager } from '@/components/ui/layout/pager';
import { t } from '@/lib/i18n/i18n';
import { activityQuery, type ActivityScope } from './activity.api';
import { actionLabel, formatAt, resultLabel, resultStyle, roleLabel } from './activity-format';
import { useClock } from '@/lib/clock';
import { useViewerTz } from '@/lib/viewer-tz';

export interface EntityActivityProps extends ActivityScope {
  /** Hide the section while nothing is logged (the student profile); a tab shows the empty text. */
  hideEmpty?: boolean;
}

/**
 * «النشاط» of one student / teacher: the same GET /activity, scoped to the entity, newest first.
 * The page lives in local state (the profile's URL stays the profile's).
 */
export function EntityActivity({ entity, entityId, hideEmpty = false }: EntityActivityProps) {
  const clock = { ...useClock(), tz: useViewerTz() };
  const [page, setPage] = useState(1);
  const headingId = useId();
  const list = useQuery(activityQuery({ page, sort: {}, filters: {} }, { entity, entityId }));
  const data = list.data;
  if (!data || (hideEmpty && data.total === 0)) return null;
  return (
    <section aria-labelledby={headingId} className="mb-6 grid gap-2">
      <h3 id={headingId} className="text-sm font-semibold">{t.activity.profileTitle}</h3>
      {data.total === 0 && <p className="text-sm text-ink-3">{t.activity.profileEmpty}</p>}
      <ul className="grid gap-1">
        {data.items.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-rule py-2 text-sm">
            <span className="tabular-nums text-ink-2">{formatAt(r.at, clock)}</span>
            <span className="font-semibold">{actionLabel(r.action, r.entity)}</span>
            <span className="text-ink-2">{r.actor_name ?? roleLabel(r.actor_role)}</span>
            <StatusChip {...resultStyle(r.status)} size="sm" label={resultLabel(r.status)} />
          </li>
        ))}
      </ul>
      <Pager page={page} total={data.total} pageSize={data.pageSize} onPage={setPage} />
    </section>
  );
}
