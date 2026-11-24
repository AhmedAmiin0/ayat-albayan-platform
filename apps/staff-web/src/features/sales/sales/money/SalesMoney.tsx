import { t } from '@ab/web-kit/lib/i18n/i18n';
import { MyEarnings } from '@/features/sales/sales/teachers/MyEarnings';
import { MyPayments } from './MyPayments';
import { MyWallet } from './MyWallet';
import { PaymentLinksSection } from './links/PaymentLinksSection';
import { ViewHead } from '@/features/sales/sales/ViewHead';

export type MoneyView = 'earnings' | 'statements' | 'payments';

export function SalesMoney({ view, onView }: { view: MoneyView; onView: (view: MoneyView) => void }) {
  return (
    <>
      <ViewHead
        title={t.assistantPortal.nav.earnings}
        label={t.sales.views.money}
        value={view}
        onChange={onView}
        options={[
          { value: 'earnings', label: t.assistantPortal.wallet.views.commissions },
          { value: 'statements', label: t.assistantPortal.wallet.views.statements },
          { value: 'payments', label: t.assistantPortal.nav.payments },
        ]}
      />
      {view === 'payments' && (
        <>
          <MyPayments />
          <PaymentLinksSection />
        </>
      )}
      {view === 'statements' && <MyEarnings />}
      {view === 'earnings' && <MyWallet />}
    </>
  );
}
