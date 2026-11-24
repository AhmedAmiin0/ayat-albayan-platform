import { useQuery } from '@tanstack/react-query';
import { earningsSummaryQuery } from '@/features/finance/payouts/api';
import { Amount } from '@/features/finance/subscriptions/balance/Amount';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { receivablesQuery } from './api';
import { KpiTile } from './kpi-tile';

/** Teachers owed comes from the ledger in EGP; students owing in the reporting currency. */
export function MoneyKpis() {
  const dues = useQuery(earningsSummaryQuery());
  const owed = useQuery(receivablesQuery);
  return (
    <ul className="grid grid-cols-2 gap-1" aria-label={t.finance.moneyKpis}>
      <KpiTile label={t.finance.teachersOwedKpi} to="/admin/payouts" query={dues}>
        {(d) => <Amount amount={d.totals.owed} currency="EGP" className="text-2xl font-bold" />}
      </KpiTile>
      <KpiTile label={t.finance.receivablesKpi} to="/admin/receivables" query={owed}>
        {(o) => (
          <>
            <Amount amount={o.total} currency={o.currency} className="text-2xl font-bold" />
            {o.fx_missing.length > 0 && (
              <span className="text-2xs text-act">
                {t.finance.fxMissing.replace('{currencies}', o.fx_missing.join(t.common.listSeparator))}
              </span>
            )}
          </>
        )}
      </KpiTile>
    </ul>
  );
}
