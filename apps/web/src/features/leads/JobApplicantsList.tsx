import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/DataTable';
import { TableBox } from '@/components/TableBox';
import { Cartouche } from '@/components/ui/display/cartouche';
import { EmptyState } from '@/components/ui/display/empty-state';
import { PageHead } from '@/components/ui/layout/page';
import { Pager } from '@/components/ui/layout/pager';
import { t } from '@/lib/i18n/i18n';
import { withFilter, withoutFilters, withSort, type ListUrlState } from '@/lib/list/list-url';
import { applicantColumns } from './applicantColumns';
import { jobApplicantsQuery } from './leads.api';

export interface JobApplicantsListProps {
  /** Page, column sort and filters, kept in the route search (R-NFR-08). */
  search: ListUrlState;
  onSearch: (next: ListUrlState) => void;
}

/** Job applicants, kept out of the lead funnel (R-LEAD-04); every column sorts and filters. */
export function JobApplicantsList({ search, onSearch }: JobApplicantsListProps) {
  const applicants = useQuery(jobApplicantsQuery(search));
  const data = applicants.data;
  // No applicant at all: the empty state; no match under a filter keeps the filter row.
  const none = data?.total === 0 && Object.keys(search.filters).length === 0;
  return (
    <>
      <PageHead>
        <Cartouche>{t.jobApplicants.title}</Cartouche>
        {data && (
          <span className="text-sm text-ink-3 tabular-nums">{t.jobApplicants.count.replace('{n}', String(data.total))}</span>
        )}
      </PageHead>
      {applicants.isError && <p role="alert">{t.common.error}</p>}
      {applicants.isPending && <p className="text-sm text-ink-3">{t.common.loading}</p>}
      {data && (
        <>
          {none ? (
            <TableBox center><EmptyState title={t.jobApplicants.empty} /></TableBox>
          ) : (
            <DataTable
              fill
              stacked
              columns={applicantColumns}
              data={data.items}
              getRowId={(r) => r.id}
              emptyText={t.common.notFound}
              sort={{ key: search.sort.sort, dir: search.sort.dir, onChange: (next) => onSearch(withSort(search, next)) }}
              filters={{ values: search.filters, onChange: (key, value) => onSearch(withFilter(search, { key, value })), onClear: (keys) => onSearch(withoutFilters(search, keys)) }}
              toolbar={{ total: data.total }}
            />
          )}
          <Pager
            page={search.page}
            total={data.total}
            pageSize={data.pageSize}
            onPage={(page) => onSearch({ ...search, page })}
          />
        </>
      )}
    </>
  );
}
