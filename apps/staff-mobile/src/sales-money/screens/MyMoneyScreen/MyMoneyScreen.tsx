import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { t, BackButton, FilterPills, Screen, ScreenHeader } from '@ab/mobile-kit';
import { MyEarningsView } from '@/sales-money/screens/MyEarningsView';
import { MyPaymentsView } from '@/sales-money/screens/MyPaymentsView';
import { MyWalletView } from '@/sales-money/wallet/MyWalletView';

export type MoneyView = 'wallet' | 'statements' | 'payments';

const VIEWS = (): { value: MoneyView; label: string }[] => [
  { value: 'wallet', label: t.assistantPortal.wallet.views.commissions },
  { value: 'statements', label: t.assistantPortal.wallet.views.statements },
  { value: 'payments', label: t.assistantPortal.nav.payments },
];

/** Read-only. */
export function MyMoneyScreen() {
  // The sales transfer's success screen links here with ?view=payments.
  const params = useLocalSearchParams<{ view?: string }>();
  const [view, setView] = useState<MoneyView>(params.view === 'payments' ? 'payments' : params.view === 'statements' ? 'statements' : 'wallet');
  return (
    <Screen>
      <ScreenHeader
        title={t.assistantPortal.nav.earnings}
        leading={<BackButton onPress={() => router.back()} />}
      />
      <FilterPills
        items={VIEWS()}
        value={view}
        onChange={setView}
        accessibilityLabel={t.sales.views.money}
      />
      {view === 'payments' ? (
        <MyPaymentsView />
      ) : view === 'statements' ? (
        <MyEarningsView />
      ) : (
        <MyWalletView />
      )}
    </Screen>
  );
}
