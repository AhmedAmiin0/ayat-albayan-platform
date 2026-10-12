import { RIYADH_TZ } from '@ab/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native';
import { t } from '@/lib/i18n';
import { inTree, useTreeBase } from '@/nav/tree-base';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { useSalesFamily } from './family';
import { SalesSubscribeForm } from './SalesSubscribeForm';

/** The chat's number; the family's zone; a child to preselect. */
type Params = { phone?: string; tz?: string; studentId?: string };

/**
 * /inbox/sales-subscribe?phone=… (R-ASST-01, owner 2026-10-12): «اشتراك جديد» from a family's chat by
 * the salesperson, for one of HER students only (GET /sales/money/family). Priced and saved through
 * the sales endpoints; then the transfer screen for the new package.
 */
export function SalesSubscribeScreen() {
  const params = useLocalSearchParams<Params>();
  const phone = params.phone ?? '';
  const family = useSalesFamily(phone);
  const students = family.data?.students ?? [];
  const base = useTreeBase();
  const back = () => (router.canGoBack() ? router.back() : router.replace(inTree(base, '/inbox')));
  return (
    <Screen>
      <ScrollView
        style={{ flex: 1, marginHorizontal: -16 }}
        contentContainerStyle={{ gap: 20, paddingHorizontal: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          title={t.salesMoney.newSubscription}
          trailing={<Button variant="ghost" label={t.common.back} onPress={back} />}
        />
        {family.isError ? (
          <ErrorState onRetry={() => void family.refetch()} />
        ) : !family.data ? null : students.length === 0 ? (
          <EmptyState title={t.salesMoney.noOwnStudents} />
        ) : (
          <SalesSubscribeForm
            phone={phone}
            tz={params.tz || RIYADH_TZ}
            students={students}
            {...(params.studentId ? { studentId: params.studentId } : {})}
          />
        )}
      </ScrollView>
    </Screen>
  );
}
