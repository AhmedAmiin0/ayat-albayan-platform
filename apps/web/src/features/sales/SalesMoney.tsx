import { t } from '@/lib/i18n';
import { MyEarnings } from './MyEarnings';
import { MyPayments } from './MyPayments';
import { ViewHead } from './ViewHead';

export type MoneyView = 'earnings' | 'payments';

/** /sales/earnings «أرباحي»: my terms, commissions and statements, or «مدفوعاتي» (the payments I recorded). */
export function SalesMoney({ view, onView }: { view: MoneyView; onView: (view: MoneyView) => void }) {
  return (
    <>
      <ViewHead
        title={t.assistantPortal.nav.earnings}
        label={t.sales.views.money}
        value={view}
        onChange={onView}
        options={[
          { value: 'earnings', label: t.assistantPortal.nav.earnings },
          { value: 'payments', label: t.assistantPortal.nav.payments },
        ]}
      />
      {view === 'payments' ? <MyPayments /> : <MyEarnings />}
    </>
  );
}
