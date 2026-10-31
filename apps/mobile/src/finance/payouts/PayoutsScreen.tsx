import type { PayoutView } from '@ab/shared';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, type ListRenderItemInfo, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { Button } from '@/core/ui/primitives/Button';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { useInsetRows } from '@/core/ui/surface/use-inset-rows';
import { currentMonth } from '@/finance/shared/month';
import { MonthPicker } from '@/finance/shared/MonthPicker';
import { PayoutDetail } from './PayoutDetail';
import { PayoutRow } from './PayoutRow';
import { usePayouts } from '@/finance/shared/queries';
import { StaleNote, StateNote } from '@/finance/shared/StateNote';

/**
 * «مستحقات المعلمين الشهرية» (admin; web /admin/payouts): pick a month, read the teachers'
 * statements, open one to approve, pay, reopen or cancel the payment. The server owns every rule.
 * The statements sit in one inset card (owner 2026-10-28: one container rule).
 */
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
        trailing={<Button variant="ghost" label={t.common.back} onPress={back} />}
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
