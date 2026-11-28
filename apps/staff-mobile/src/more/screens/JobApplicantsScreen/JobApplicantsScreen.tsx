import { JOB_APPLICANT_STATUSES } from '@ab/catalog';
import { jobApplicantStatusStyle } from '@ab/money';
import { useState } from 'react';

import {
  EmptyState,
  ErrorState,
  type FilterPill,
  FilterPills,
  LazyList,
  Screen,
  ScreenHeader,
  t,
} from '@ab/mobile-kit';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { ApplicantRow } from '@/more/applicants/ApplicantRow';
import { applicantParams, applicantSortChoices, type ApplicantStatusFilter } from '@/more/applicants/applicant-params';
import type { JobApplicant } from '@/core/lib/staff/types';

const statusPills = (): FilterPill<ApplicantStatusFilter>[] => [
  { value: 'all', label: t.leads.filterAll },
  ...JOB_APPLICANT_STATUSES.map((s) => ({
    value: s,
    label: t.enums.jobApplicantStatus[s],
    ...jobApplicantStatusStyle[s],
  })),
];

const keyOf = (applicant: JobApplicant) => applicant.id;
// Keyed by the applicant: its links hold a «failed» line that a recycled row must not carry over.
const renderRow = ({ item }: { item: JobApplicant }) => (
  <ApplicantRow key={item.id} applicant={item} />
);

/** R-LEAD-04: read-only; moving an applicant through the pipeline stays on the web. */
export function JobApplicantsScreen() {
  const [status, setStatus] = useState<ApplicantStatusFilter>('all');
  const [sort, setSort] = useState('');
  const list = usePagedList<JobApplicant>({ path: '/job-applicants', params: applicantParams(status, sort) });
  const loaded = list.data !== undefined;
  const pills = statusPills().map((p) =>
    loaded && p.value === status ? { ...p, count: list.total } : p,
  );
  const filtered = status !== 'all';
  return (
    <Screen list>
      <ScreenHeader title={t.nav.jobApplicants} size="h2" connecting />
      <FilterPills
        items={pills}
        value={status}
        onChange={setStatus}
        accessibilityLabel={t.mobileLeads.applicantsFilter}
      />
      <FilterPills
        items={applicantSortChoices()}
        value={sort}
        onChange={setSort}
        accessibilityLabel={t.mobileLeads.applicantsSort}
        role="radiogroup"
      />
      <LazyList
        paged={list}
        keyExtractor={keyOf}
        renderItem={renderRow}
        ListEmptyComponent={
          list.isPending ? null : list.isError ? (
            <ErrorState onRetry={list.refresh} />
          ) : (
            <EmptyState title={filtered ? t.mobileLeads.noMatch : t.jobApplicants.empty} />
          )
        }
      />
    </Screen>
  );
}
