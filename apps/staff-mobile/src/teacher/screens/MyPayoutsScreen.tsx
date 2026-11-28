import { payoutStatusStyle, type PayoutView } from '@ab/money';
import { router } from 'expo-router';
import { View } from 'react-native';
import {
  t,
  shape,
  type,
  useTheme,
  AppText,
  BackButton,
  EmptyState,
  ErrorState,
  LazyList,
  Screen,
  ScreenHeader,
  StatusChip,
} from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { egp } from '@/earnings/lib/format';
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

/** Monthly payouts (R-TCH-04) in EGP, newest first; read-only. */
export function MyPayoutsScreen() {
  const payouts = useMyPayouts();
  return (
    <Screen>
      <ScreenHeader
        title={t.earnings.monthly}
        leading={<BackButton onPress={() => router.back()} />}
      />
      <LazyList
        inset={false}
        gap={12}
        tabBar={false}
        endSpace={24}
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
