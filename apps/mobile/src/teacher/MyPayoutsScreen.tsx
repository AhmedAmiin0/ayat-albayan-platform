import { payoutStatusStyle, type PayoutView } from '@ab/shared';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { FlatList, View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { Section } from '@/more/Section';
import { earningsKey, MY_BASE } from '@/teacher-earnings/queries';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { StatusChip } from '@/ui/StatusChip';
import { breakdownLines, monthLabel, payoutSummary, payoutWhen } from './payout-text';
import { MyEarningsSection } from './MyEarningsSection';
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
 * «مستحقاتي» (R-TCH-04): my per-session balance and payments on top (MyEarningsSection), then
 * «كشوف الشهور»: my months newest first, each with its lessons, the amount in EGP, its state
 * (مسودة / اتعتمدت / اتدفعت) and the breakdown by lesson length. Read-only.
 */
export function MyPayoutsScreen() {
  const payouts = useMyPayouts();
  const client = useQueryClient();
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
        ListHeaderComponent={
          <View style={{ gap: 20 }}>
            <MyEarningsSection />
            <Section title={t.teacherEarnings.monthsTitle}>{null}</Section>
          </View>
        }
        refreshing={payouts.isRefetching}
        onRefresh={() => {
          void payouts.refetch();
          void client.invalidateQueries({ queryKey: earningsKey(MY_BASE) });
        }}
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
