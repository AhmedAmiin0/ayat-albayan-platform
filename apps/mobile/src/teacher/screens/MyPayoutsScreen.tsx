import { payoutStatusStyle, type PayoutView } from '@ab/shared';
import { router } from 'expo-router';
import { FlatList, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { egp } from '@/earnings/lib/format';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { breakdownLines, monthLabel, payoutSummary, payoutWhen } from '@/teacher/lib/payout-text';
import { useMyPayouts } from '@/teacher/lib/queries';

function PayoutCard({ payout }: { payout: PayoutView }) {
  const { color } = useTheme();
  const when = payoutWhen(payout);
  return (
    <View style={{ gap: 6, padding: 12, borderRadius: shape.radius.lg, borderWidth: 1, borderColor: color.rule, backgroundColor: color.raised }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.base, color: color.ink }}>{monthLabel(payout.month)}</AppText>
        <StatusChip {...payoutStatusStyle[payout.status]} label={t.enums.payoutStatus[payout.status]} size="sm" />
      </View>
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.sm, color: color.ink, fontVariant: ['tabular-nums'] }}>
        {payoutSummary(payout)}
      </AppText>
      {breakdownLines(payout).map((line) => (
        <Note key={line}>{line}</Note>
      ))}
      {payout.ledger_paid ? (
        <Note>{t.earnings.ledgerPaid.replace('{amount}', egp(payout.ledger_paid))}</Note>
      ) : null}
      {when ? <Note>{when}</Note> : null}
    </View>
  );
}

/**
 * «كشوف الشهر» (R-TCH-04): my months newest first, each with its lessons, the amount in EGP, its
 * state (مسودة / اتعتمدت / اتدفعت) and the breakdown by lesson length. Read-only.
 */
export function MyPayoutsScreen() {
  const payouts = useMyPayouts();
  return (
    <Screen>
      <ScreenHeader
        title={t.earnings.monthly}
        trailing={<Button variant="ghost" label={t.common.back} onPress={() => router.back()} />}
      />
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
        data={payouts.data ?? []}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <PayoutCard payout={item} />}
        refreshing={payouts.isRefetching}
        onRefresh={() => void payouts.refetch()}
        ListEmptyComponent={
          payouts.data ? (
            <EmptyState title={t.payouts.empty} />
          ) : payouts.isError ? (
            <ErrorState onRetry={() => void payouts.refetch()} />
          ) : (
            <Note>{t.common.loading}</Note>
          )
        }
      />
    </Screen>
  );
}
