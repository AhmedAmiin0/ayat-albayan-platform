import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { MyEarningsView } from './MyEarningsView';
import { MyPaymentsView } from './MyPaymentsView';
import { MyWalletView } from '../wallet/MyWalletView';

export type MoneyView = 'wallet' | 'statements' | 'payments';

const VIEWS = (): { value: MoneyView; label: string }[] => [
  { value: 'wallet', label: t.assistantPortal.wallet.views.commissions },
  { value: 'statements', label: t.assistantPortal.wallet.views.statements },
  { value: 'payments', label: t.assistantPortal.nav.payments },
];

/**
 * «محفظتي» of the salesperson (web /sales/earnings, SalesMoney), read-only: «العمولات» (the balance and
 * every commission, live after each payment), «الكشوف» (my terms, this month and my statements) and
 * «مدفوعاتي» (the payments I recorded) as filters of the same page.
 */
export function MyMoneyScreen() {
  // ?view=payments opens «مدفوعاتي» directly (the sales transfer's success screen links here).
  const params = useLocalSearchParams<{ view?: string }>();
  const [view, setView] = useState<MoneyView>(params.view === 'payments' ? 'payments' : params.view === 'statements' ? 'statements' : 'wallet');
  return (
    <Screen>
      <ScreenHeader
        title={t.assistantPortal.nav.earnings}
        trailing={<Button variant="ghost" label={t.common.back} onPress={() => router.back()} />}
      />
      <FilterPills items={VIEWS()} value={view} onChange={setView} accessibilityLabel={t.sales.views.money} />
      {view === 'payments' ? <MyPaymentsView /> : view === 'statements' ? <MyEarningsView /> : <MyWalletView />}
    </Screen>
  );
}
