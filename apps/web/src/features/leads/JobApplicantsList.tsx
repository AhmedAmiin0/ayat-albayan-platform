import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/DataTable';
import { Cartouche } from '@/components/ui/cartouche';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHead } from '@/components/ui/page';
import { Pager } from '@/components/ui/pager';
import { t } from '@/lib/i18n';
import { applicantColumns } from './applicantColumns';
import { jobApplicantsQuery } from './leads.api';
import type { PageSearch } from './types';

export interface JobApplicantsListProps {
  search: PageSearch;
  onSearch: (next: PageSearch) => void;
}

/** Job applicants, kept out of the lead funnel (R-LEAD-04). */
export function JobApplicantsList({ search, onSearch }: JobApplicantsListProps) {
  const applicants = useQuery(jobApplicantsQuery(search));
  const data = applicants.data;
  return (
    <>
      <PageHead>
        <Cartouche>{t.jobApplicants.title}</Cartouche>
        {data && <span className="text-sm text-ink-3 tabular-nums">{data.total}</span>}
      </PageHead>
      {applicants.isError && <p role="alert">{t.common.error}</p>}
      {applicants.isPending && <p className="text-sm text-ink-3">{t.common.loading}</p>}
      {data && (
        <>
          {data.items.length === 0 ? (
            <EmptyState title={t.jobApplicants.empty} />
          ) : (
            <DataTable columns={applicantColumns} data={data.items} getRowId={(r) => r.id} />
          )}
          <Pager
            page={search.page}
            total={data.total}
            pageSize={data.pageSize}
            onPage={(page) => onSearch({ page })}
          />
        </>
      )}
    </>
  );
}
