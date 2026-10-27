import type { PaymentKind, PaymentView } from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { LazyList } from '@/core/ui/layout/LazyList';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { paymentParams } from './filters';
import { PaymentFilters } from './PaymentFilters';
import { PaymentItem } from './PaymentItem';
import { PaymentTotals } from './PaymentTotals';
import { periodTotals } from '../shared/queries';

const keyOf = (p: PaymentView) => p.id;
// Keyed by the payment: its receipt viewers hold state (open, loading) that a recycled row must not carry over.
const renderPayment = ({ item }: { item: PaymentView }) => <PaymentItem key={item.id} payment={item} />;

/**
 * «كل المدفوعات» (web /admin/payments): newest first, filtered by type and month, with the period's
 * net and each payment's receipt. Read-only: editing or voiding stays on the web (no mobile form).
 */
export function PaymentsScreen() {
  const { color } = useTheme();
  const [kind, setKind] = useState<PaymentKind | 'all'>('all');
  const [month, setMonth] = useState('all');
  const list = usePagedList<PaymentView>({ path: '/payments', params: paymentParams(kind, month) });
  const totals = periodTotals(list.data?.pages[0]);
  return (
    <Screen>
      <ScreenHeader
        title={t.mobileMoney.paymentsTitle}
        subtitle={list.data ? t.mobileMoney.paymentsCount.replace('{n}', String(list.total)) : undefined}
        trailing={<Button variant="ghost" label={t.common.back} onPress={() => router.back()} />}
      />
      <PaymentFilters kind={kind} month={month} onKind={setKind} onMonth={setMonth} />
      <LazyList
        paged={list}
        tabBar={false}
        keyExtractor={keyOf}
        renderItem={renderPayment}
        ListHeaderComponent={<PaymentTotals totals={totals} />}
        ListFooterComponent={
          list.data ? (
            <AppText style={{ margin: 16, fontFamily: type.ui[400], fontSize: type.size.xs, color: color.ink3 }}>
              {t.mobileMoney.webOnlyEdit}
            </AppText>
          ) : null
        }
        ListEmptyComponent={
          list.data ? (
            <EmptyState title={t.mobileMoney.paymentsEmpty} />
          ) : list.isError ? (
            <ErrorState onRetry={list.refresh} />
          ) : (
            <ActivityIndicator accessibilityLabel={t.common.loading} color={color.lapis} style={{ paddingVertical: 32 }} />
          )
        }
      />
    </Screen>
  );
}
