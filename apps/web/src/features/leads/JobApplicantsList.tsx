import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/DataTable';
import { t } from '@/lib/i18n';
import { applicantColumns } from './applicantColumns';
import { jobApplicantsQuery } from './leads.api';
import { Pager } from './Pager';
import type { PageSearch } from './types';

export interface JobApplicantsListProps {
  search: PageSearch;
  onSearch: (next: PageSearch) => void;
}

/** Job applicants, kept out of the lead funnel (R-LEAD-04). */
export function JobApplicantsList({ search, onSearch }: JobApplicantsListProps) {
  const applicants = useQuery(jobApplicantsQuery(search));
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">{t.jobApplicants.title}</h2>
      {applicants.isError && <p role="alert">{t.common.error}</p>}
      {applicants.isPending && <p>{t.common.loading}</p>}
      {applicants.data && (
        <>
          <DataTable
            columns={applicantColumns}
            data={applicants.data.items}
            getRowId={(r) => r.id}
            emptyText={t.jobApplicants.empty}
          />
          <Pager
            page={search.page}
            total={applicants.data.total}
            pageSize={applicants.data.pageSize}
            onPage={(page) => onSearch({ page })}
          />
        </>
      )}
    </section>
  );
}
