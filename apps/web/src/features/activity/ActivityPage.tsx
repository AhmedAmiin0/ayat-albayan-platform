import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/DataTable';
import { TableBox } from '@/components/TableBox';
import { Cartouche } from '@/components/ui/cartouche';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHead } from '@/components/ui/page';
import { Pager } from '@/components/ui/pager';
import { t } from '@/lib/i18n';
import { withFilter, withSort, type ListUrlState } from '@/lib/list-url';
import { activityQuery } from './activity.api';
import { activityColumns } from './activityColumns';

export interface ActivityPageProps {
  /** Page, column sort and filters, kept in the route search (R-NFR-08). */
  search: ListUrlState;
  onSearch: (next: ListUrlState) => void;
}

/** «سجل النشاط» (owner, 2026-10-05): every change made through the API, newest first. Admin only. */
export function ActivityPage({ search, onSearch }: ActivityPageProps) {
  const activity = useQuery(activityQuery(search));
  const data = activity.data;
  // Nothing logged at all: the empty state; no match under a filter keeps the filter row.
  const none = data?.total === 0 && Object.keys(search.filters).length === 0;
  return (
    <>
      <PageHead>
        <Cartouche>{t.activity.title}</Cartouche>
        {data && <span className="text-sm text-ink-3 tabular-nums">{t.activity.count.replace('{n}', String(data.total))}</span>}
      </PageHead>
      {activity.isError && <p role="alert">{t.common.error}</p>}
      {activity.isPending && <p className="text-sm text-ink-3">{t.common.loading}</p>}
      {data && (
        <>
          {none ? (
            <TableBox center><EmptyState title={t.activity.empty} /></TableBox>
          ) : (
            <DataTable
              fill
              stacked
              columns={activityColumns}
              data={data.items}
              getRowId={(r) => r.id}
              emptyText={t.common.notFound}
              sort={{ key: search.sort.sort, dir: search.sort.dir, onChange: (next) => onSearch(withSort(search, next)) }}
              filters={{ values: search.filters, onChange: (key, value) => onSearch(withFilter(search, { key, value })) }}
            />
          )}
          <Pager page={search.page} total={data.total} pageSize={data.pageSize} onPage={(page) => onSearch({ ...search, page })} />
        </>
      )}
    </>
  );
}
