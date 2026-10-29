import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { Button } from '@/core/ui/primitives/Button';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { useSalesFamily } from '../lib/family';
import { SalesSubscribeForm } from '../components/SalesSubscribeForm';

/**
 * The chat's number; a child to preselect (any zone the link carries is ignored: the academy's day rules);
 * `renew` '1' = «جدّد الاشتراك»: a child due for one opens on its last package (several due: none picked yet).
 */
type Params = { phone?: string; studentId?: string; renew?: string };

/**
 * /inbox/sales-subscribe?phone=… (R-ASST-01, owner 2026-10-12): «اشتراك جديد» from a family's chat by
 * the salesperson, for one of HER students only (GET /sales/money/family), the child picked here (owner
 * 2026-10-29: no names on the chat's pills). Priced and saved through the sales endpoints; then the
 * package's weekly days and its transfer, or a payment link (the Stripe test build). A preselected child of
 * hers also offers «أيام الحلقات» straight away (a package already sold, its days not booked yet).
 */
export function SalesSubscribeScreen() {
  const params = useLocalSearchParams<Params>();
  const phone = params.phone ?? '';
  const family = useSalesFamily(phone);
  const students = family.data?.students ?? [];
  const base = useTreeBase();
  const back = () => (router.canGoBack() ? router.back() : router.replace(inTree(base, '/inbox')));
  const own = students.find((s) => s.id === params.studentId);
  const renew = params.renew === '1';
  // «أيام الحلقات» stays hers only: a child listed through sales.renew_any (`mine: false`) gets the package only.
  const courseDays = own && own.mine !== false
    ? () => router.push(inTree(base, { pathname: '/inbox/sales-course', params: { studentId: own.id } }))
    : undefined;
  return (
    <Screen>
      <ScrollView
        style={{ flex: 1, marginHorizontal: -16 }}
        contentContainerStyle={{ gap: 20, paddingHorizontal: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          title={renew ? t.students.renew : t.salesMoney.newSubscription}
          trailing={<Button variant="ghost" label={t.common.back} onPress={back} />}
        />
        {family.isError ? (
          <ErrorState onRetry={() => void family.refetch()} />
        ) : !family.data ? null : students.length === 0 ? (
          <EmptyState title={t.salesMoney.noOwnStudents} />
        ) : (
          <>
            {courseDays ? <Button variant="secondary" label={t.booking.courseDays} onPress={courseDays} /> : null}
            <SalesSubscribeForm
              phone={phone}
              students={students}
              renew={renew}
              onDone={back}
              {...(params.studentId ? { studentId: params.studentId } : {})}
            />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
