import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { t } from '@/lib/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
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
  // ?view=payments opens «مدفوعاتي» directly (the sales transfer's success screen links here).
  const params = useLocalSearchParams<{ view?: string }>();
  const [view, setView] = useState<MoneyView>(params.view === 'payments' ? 'payments' : 'earnings');
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
