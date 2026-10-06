import { formatPhone, JOB_APPLICANT_STATUSES, jobApplicantStatusStyle } from '@ab/shared';
import { useState } from 'react';
import { FlatList } from 'react-native';
import { t } from '@/lib/i18n';
import { usePagedList } from '@/lib/use-paged-list';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { FilterPills, type FilterPill } from '@/ui/FilterPills';
import { ListRow } from '@/ui/ListRow';
import { ltr } from '@/ui/Ltr';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { StatusChip } from '@/ui/StatusChip';
import { ApplicantLinks } from './applicants/ApplicantLinks';
import { applicantParams, applicantSortChoices, type ApplicantStatusFilter } from './applicants/applicant-params';
import type { JobApplicant } from './types';

const statusPills = (): FilterPill<ApplicantStatusFilter>[] => [
  { value: 'all', label: t.leads.filterAll },
  ...JOB_APPLICANT_STATUSES.map((s) => ({ value: s, label: t.enums.jobApplicantStatus[s], ...jobApplicantStatusStyle[s] })),
];

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
      <FilterPills items={applicantSortChoices()} value={sort} onChange={setSort} accessibilityLabel={t.mobileLeads.applicantsSort} />
      <FlatList
        style={{ flex: 1, marginHorizontal: -16 }}
        data={list.items}
        keyExtractor={(applicant) => applicant.id}
        renderItem={({ item }) => {
          const phone = formatPhone(item.phone_e164);
          return (
            <ListRow
              title={item.name ?? ltr(phone)}
              meta={item.name ? phone : undefined}
              tags={<ApplicantLinks cv={item.cv_url} recitation={item.recitation_url} />}
              trailing={<StatusChip {...jobApplicantStatusStyle[item.status]} label={t.enums.jobApplicantStatus[item.status]} />}
            />
          );
        }}
        onEndReached={list.loadMore}
        refreshing={list.isRefetching}
        onRefresh={list.refresh}
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
