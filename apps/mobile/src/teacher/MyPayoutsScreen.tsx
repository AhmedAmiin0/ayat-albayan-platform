import { payoutStatusStyle, type PayoutView } from '@ab/shared';
import { router } from 'expo-router';
import { FlatList, View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { StatusChip } from '@/ui/StatusChip';
import { breakdownLines, monthLabel, payoutSummary, payoutWhen } from './payout-text';
import { useMyPayouts } from './queries';

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
      {when ? <Note>{when}</Note> : null}
    </View>
  );
}

/**
 * «مستحقاتي» (R-TCH-04): my months newest first, each with its lessons, the amount in EGP, its
 * state (مسودة / اتعتمدت / اتدفعت) and the breakdown by lesson length. Read-only.
 */
export function MyPayoutsScreen() {
  const payouts = useMyPayouts();
  return (
    <Screen>
      <ScreenHeader
        title={t.teacherNav.payouts}
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
          payouts.data ? <EmptyState title={t.payouts.empty} /> : payouts.isError ? <ErrorState onRetry={() => void payouts.refetch()} /> : null
        }
      />
    </Screen>
  );
}
