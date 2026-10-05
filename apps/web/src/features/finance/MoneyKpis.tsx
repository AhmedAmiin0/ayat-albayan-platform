import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { earningsSummaryQuery } from '@/features/payouts/api';
import { Amount } from '@/features/subscriptions/Amount';
import { t } from '@/lib/i18n';
import { receivablesQuery } from './api';

const tile = 'grid gap-1 rounded-xs px-3 py-3 no-underline hover:bg-sunk/75';

/**
 * Two money numbers on the dashboard (owner, 2026-10-05): «مستحق للمعلمين» (the ledger, EGP) and
 * «مستحق على الطلاب» (receivables in the reporting currency); each opens the page behind it.
 */
export function MoneyKpis() {
  const dues = useQuery(earningsSummaryQuery());
  const owed = useQuery(receivablesQuery);
  return (
    <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2" aria-label={t.finance.moneyKpis}>
      <li>
        <Link to="/admin/payouts" className={tile}>
          <span className="text-xs text-ink-2">{t.finance.teachersOwedKpi}</span>
          {dues.data ? <Amount amount={dues.data.totals.owed} currency="EGP" className="text-2xl font-bold" /> : <span className="text-ink-3">—</span>}
        </Link>
      </li>
      <li>
        <Link to="/admin/receivables" className={tile}>
          <span className="text-xs text-ink-2">{t.finance.receivablesKpi}</span>
          {owed.data ? (
            <Amount amount={owed.data.total} currency={owed.data.currency} className="text-2xl font-bold" />
          ) : (
            <span className="text-ink-3">—</span>
          )}
          {owed.data && owed.data.fx_missing.length > 0 && (
            <span className="text-2xs text-act">{t.finance.fxMissing.replace('{currencies}', owed.data.fx_missing.join('، '))}</span>
          )}
        </Link>
      </li>
    </ul>
  );
}
