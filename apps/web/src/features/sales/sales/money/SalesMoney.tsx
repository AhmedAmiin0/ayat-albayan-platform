import { t } from '@/lib/i18n/i18n';
import { MyEarnings } from '@/features/sales/sales/teachers/MyEarnings';
import { MyPayments } from './MyPayments';
import { MyWallet } from './MyWallet';
import { PaymentLinksSection } from './links/PaymentLinksSection';
import { ViewHead } from '@/features/sales/sales/ViewHead';

/** 'earnings' = «العمولات» (the default, /sales/earnings); 'statements' = «الكشوف»; 'payments' = «مدفوعاتي». */
export type MoneyView = 'earnings' | 'statements' | 'payments';

/**
 * /sales/earnings «محفظتي» (owner 2026-10-29): «العمولات» (the balance and my commissions, live after each
 * payment), «الكشوف» (my terms, this month and my statements) or «مدفوعاتي» (the payments I recorded, then
 * «روابط الدفع» in a Stripe build).
 */
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
