import type { PaymentKind } from '@ab/catalog';
import type { PaymentView } from '@ab/money';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import {
  t,
  type,
  useTheme,
  AppText,
  BackButton,
  EmptyState,
  ErrorState,
  Screen,
  ScreenHeader,
} from '@ab/mobile-kit';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { LazyList } from '@/core/ui/lists/LazyList';
import { paymentParams } from '@/money/payments/filters';
import { PaymentFilters } from '@/money/payments/PaymentFilters';
import { PaymentItem } from '@/money/payments/PaymentItem';
import { PaymentTotals } from '@/money/payments/PaymentTotals';
import { periodTotals } from '@/money/shared/queries';

const keyOf = (p: PaymentView) => p.id;
// Keyed by the payment: its receipt viewers hold state (open, loading) that a recycled row must not carry over.
const renderPayment = ({ item }: { item: PaymentView }) => <PaymentItem key={item.id} payment={item} />;

/**
 * «كل المدفوعات» (web /admin/payments): newest first, filtered by type and month, with the period's
 * net and each payment's receipt. Read-only: editing or voiding stays on the web (no mobile form).
 * The list screens' compact top (owner 2026-10-28): «كل المدفوعات · 40» on the title's line, 8pt apart.
 */
export function PaymentsScreen() {
  const { color } = useTheme();
  const [kind, setKind] = useState<PaymentKind | 'all'>('all');
  const [month, setMonth] = useState('all');
  const list = usePagedList<PaymentView>({ path: '/payments', params: paymentParams(kind, month) });
  const totals = periodTotals(list.data?.pages[0]);
  return (
    <Screen list>
      <ScreenHeader
        title={t.mobileMoney.paymentsTitle}
        size="h2"
        connecting
        count={list.data ? list.total : undefined}
        leading={<BackButton onPress={() => router.back()} />}
      />
      <PaymentFilters kind={kind} month={month} onKind={setKind} onMonth={setMonth} />
      <LazyList
        paged={list}
        keyExtractor={keyOf}
        renderItem={renderPayment}
        ListHeaderComponent={<PaymentTotals totals={totals} />}
        ListFooterComponent={
          list.data ? (
            <AppText style={{ paddingTop: 12, fontFamily: type.ui[400], fontSize: type.size.xs, color: color.ink3 }}>
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
