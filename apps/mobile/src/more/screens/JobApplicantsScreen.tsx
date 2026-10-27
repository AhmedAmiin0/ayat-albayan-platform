import { JOB_APPLICANT_STATUSES, jobApplicantStatusStyle } from '@ab/shared';
import { useState } from 'react';

import { t } from '@/core/lib/i18n/i18n';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { FilterPills, type FilterPill } from '@/core/ui/form/FilterPills';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { ApplicantRow } from '../applicants/ApplicantRow';
import { applicantParams, applicantSortChoices, type ApplicantStatusFilter } from '../applicants/applicant-params';
import type { JobApplicant } from '../types';
import { LazyList } from '@/core/ui/layout/LazyList';

const statusPills = (): FilterPill<ApplicantStatusFilter>[] => [
  { value: 'all', label: t.leads.filterAll },
  ...JOB_APPLICANT_STATUSES.map((s) => ({ value: s, label: t.enums.jobApplicantStatus[s], ...jobApplicantStatusStyle[s] })),
];

const keyOf = (applicant: JobApplicant) => applicant.id;
// Keyed by the applicant: its links hold a «failed» line that a recycled row must not carry over.
const renderRow = ({ item }: { item: JobApplicant }) => <ApplicantRow key={item.id} applicant={item} />;

/**
 * «طلبات التوظيف», read-only (R-LEAD-04, as the web list): status filter, order, name + LTR phone +
 * status, and the CV and recitation links. Rows are not buttons: moving an applicant through the
 * pipeline stays on the web for now.
 */
export function JobApplicantsScreen() {
  const [status, setStatus] = useState<ApplicantStatusFilter>('all');
  const [sort, setSort] = useState('');
  const list = usePagedList<JobApplicant>({ path: '/job-applicants', params: applicantParams(status, sort) });
  const loaded = list.data !== undefined;
  const pills = statusPills().map((p) => (loaded && p.value === status ? { ...p, count: list.total } : p));
  const filtered = status !== 'all';
  return (
    <Screen>
      <ScreenHeader title={t.nav.jobApplicants} />
      <FilterPills items={pills} value={status} onChange={setStatus} accessibilityLabel={t.mobileLeads.applicantsFilter} />
      <FilterPills items={applicantSortChoices()} value={sort} onChange={setSort} accessibilityLabel={t.mobileLeads.applicantsSort} role="radiogroup" />
      <LazyList
        paged={list}
        tabBar={false}
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
