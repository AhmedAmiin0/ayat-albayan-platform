import { router } from 'expo-router';
import { useState } from 'react';
import { t } from '@/lib/i18n';
import { Button } from '@/ui/Button';
import { FilterPills } from '@/ui/FilterPills';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { MyEarningsView } from './MyEarningsView';
import { MyPaymentsView } from './MyPaymentsView';

export type MoneyView = 'earnings' | 'payments';

const VIEWS = (): { value: MoneyView; label: string }[] => [
  { value: 'earnings', label: t.assistantPortal.nav.earnings },
  { value: 'payments', label: t.assistantPortal.nav.payments },
];

/**
 * «أرباحي» of the salesperson (web /sales/earnings, SalesMoney): my terms, commissions and statements,
 * or «مدفوعاتي» (the payments I recorded) as a filter of the same page. Read-only.
 */
export function MyMoneyScreen() {
  const [view, setView] = useState<MoneyView>('earnings');
  return (
    <Screen>
      <ScreenHeader
        title={t.assistantPortal.nav.earnings}
        trailing={<Button variant="ghost" label={t.common.back} onPress={() => router.back()} />}
      />
      <FilterPills items={VIEWS()} value={view} onChange={setView} accessibilityLabel={t.sales.views.money} />
      {view === 'payments' ? <MyPaymentsView /> : <MyEarningsView />}
    </Screen>
  );
}
