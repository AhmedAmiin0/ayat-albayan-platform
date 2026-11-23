import type { PayoutView } from '@ab/money';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, type ListRenderItemInfo, View } from 'react-native';
import { t, BackButton, Screen, ScreenHeader } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { useInsetRows } from '@/core/ui/surface/use-inset-rows';
import { currentMonth } from '@/finance/shared/month';
import { MonthPicker } from '@/finance/shared/MonthPicker';
import { PayoutDetail } from '@/finance/payouts/PayoutDetail';
import { PayoutRow } from '@/finance/payouts/PayoutRow';
import { usePayouts } from '@/finance/shared/queries';
import { StaleNote, StateNote } from '@/finance/shared/StateNote';

/** The server owns every payout rule. */
export function PayoutsScreen() {
  const [month, setMonth] = useState(currentMonth());
  const [openId, setOpenId] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const payouts = usePayouts(month);
  const open = payouts.data?.find((p) => p.id === openId) ?? null;
  const renderRow = useCallback(
    ({ item }: ListRenderItemInfo<PayoutView>) => <PayoutRow payout={item} onPress={() => setOpenId(item.id)} />,
    [],
  );
  const cells = useInsetRows(renderRow, payouts.data?.length ?? 0);
  const back = () => {
    if (paying) setPaying(false);
    else if (open) setOpenId(null);
    else router.back();
  };
  return (
    <Screen>
      <ScreenHeader
        title={open ? open.teacher.display_name_ar : t.mobileFinance.rows.payouts}
        leading={<BackButton onPress={back} />}
      />
      {notice ? <Note>{notice}</Note> : null}
      {open ? (
        <PayoutDetail payout={open} paying={paying} onPaying={setPaying} onNotice={setNotice} />
      ) : (
        <>
          <MonthPicker month={month} onChange={setMonth} />
          <StaleNote isError={payouts.isError} hasData={!!payouts.data} />
          <FlatList
            style={{ flex: 1 }}
            data={payouts.data ?? []}
            keyExtractor={(p) => p.id}
            {...cells}
            refreshing={payouts.isRefetching}
            onRefresh={() => void payouts.refetch()}
            ListEmptyComponent={<StateNote status={payouts} empty emptyTitle={t.payouts.empty} />}
            ListFooterComponent={<View style={{ height: 24 }} />}
          />
        </>
      )}
    </Screen>
  );
}
