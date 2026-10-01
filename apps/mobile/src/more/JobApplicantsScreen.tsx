import { formatPhone, jobApplicantStatusStyle } from '@ab/shared';
import { FlatList } from 'react-native';
import { t } from '@/lib/i18n';
import { usePagedList } from '@/lib/use-paged-list';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { ListRow } from '@/ui/ListRow';
import { ltr } from '@/ui/Ltr';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { StatusChip } from '@/ui/StatusChip';
import type { JobApplicant } from './types';

/**
 * «طلبات التوظيف», read-only (R-LEAD-04): newest first, name + LTR phone + status. Rows are not
 * buttons: moving an applicant through the pipeline stays on the web for now.
 */
export function JobApplicantsScreen() {
  const list = usePagedList<JobApplicant>({ path: '/job-applicants' });
  return (
    <Screen>
      <ScreenHeader title={t.nav.jobApplicants} />
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
              trailing={
                <StatusChip
                  {...jobApplicantStatusStyle[item.status]}
                  label={t.enums.jobApplicantStatus[item.status]}
                />
              }
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
            <EmptyState title={t.jobApplicants.empty} />
          )
        }
      />
    </Screen>
  );
}
