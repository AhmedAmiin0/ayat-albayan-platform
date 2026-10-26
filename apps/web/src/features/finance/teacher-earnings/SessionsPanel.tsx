import type { TeacherEarningView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { EmptyState } from '@/components/ui/display/empty-state';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Pager } from '@/components/ui/layout/pager';
import { SegmentedControl } from '@/components/ui/form/segmented-control';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { t } from '@/lib/i18n/i18n';
import type { SortSearch } from '@/lib/list/list-search';
import { sessionsQuery, type Scope, type SessionFilter } from './api';
import { PickContext, sessionColumns, type Pick } from './session-columns';

type Props = {
  scope: Scope;
  /** Admin only: the ticked sessions (kept across pages and filters). */
  selected?: ReadonlyMap<string, TeacherEarningView>;
  onSelected?: (next: Map<string, TeacherEarningView>) => void;
};

const FILTERS: SessionFilter[] = ['all', 'unpaid', 'paid'];

/**
 * The sessions table with a status filter, server sort, a pager and (admin) ticks for the pay
 * dialog. Sort/filter/page stay in component state: the page holds two server tables (sessions and
 * payments), and one URL `sort` could not serve both.
 */
export function SessionsPanel({ scope, selected, onSelected }: Props) {
  const [status, setStatus] = useState<SessionFilter>('all');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortSearch>({});
  const list = useQuery(sessionsQuery(scope, { status, page, sort }));
  const rows = useMemo(() => list.data?.items ?? [], [list.data]);

  const pick: Pick | undefined = useMemo(() => {
    if (!selected || !onSelected) return undefined;
    const change = (fn: (m: Map<string, TeacherEarningView>) => void) => {
      const next = new Map(selected);
      fn(next);
      onSelected(next);
    };
    return {
      selected,
      rows,
      onToggle: (r) => change((m) => void (m.delete(r.id) || m.set(r.id, r))),
      onToggleAll: (all, on) => change((m) => all.forEach((r) => (on ? m.set(r.id, r) : m.delete(r.id)))),
    };
  }, [selected, onSelected, rows]);
  const selectable = selected !== undefined;
  const columns = useMemo(() => sessionColumns(selectable), [selectable]);

  return (
    <section aria-label={t.earnings.sessions} className="mb-7">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-base font-semibold text-ink">{t.earnings.sessions}</h2>
        <SegmentedControl
          className="ms-auto"
          label={t.earnings.status}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={FILTERS.map((value) => ({ value, label: t.earnings.filter[value] }))}
        />
      </div>
      {list.isError && <FormAlert>{t.common.error}</FormAlert>}
      {list.isPending && <ListSkeleton />}
      {list.data?.total === 0 && <EmptyState title={status === 'all' ? t.earnings.empty : t.earnings.emptyFilter} />}
      {list.data && list.data.total > 0 && (
        <>
          <PickContext.Provider value={pick ?? null}>
            <DataTable
              stacked
              columns={columns}
              data={rows}
              getRowId={(r) => r.id}
              sort={{ key: sort.sort, dir: sort.dir, onChange: (next) => (setSort(next.key ? { sort: next.key, ...(next.dir ? { dir: next.dir } : {}) } : {}), setPage(1)) }}
            />
          </PickContext.Provider>
          <Pager page={list.data.page} total={list.data.total} pageSize={list.data.pageSize} onPage={setPage} />
        </>
      )}
    </section>
  );
}
