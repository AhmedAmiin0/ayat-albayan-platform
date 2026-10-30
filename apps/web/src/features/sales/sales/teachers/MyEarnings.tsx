import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/form/button';
import { EmptyState } from '@/components/ui/display/empty-state';
import { FormAlert } from '@/components/ui/form/form-alert';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { t } from '@/lib/i18n/i18n';
import { myEarningsQuery } from '../api';
import { CurrencyTotalsList } from '../money/CurrencyTotalsList';
import { EarningsTerms } from './EarningsTerms';
import { StatementCard } from '../money/StatementCard';

const p = t.assistantPortal.earnings;

/**
 * «الكشوف» of «محفظتي» on /sales/earnings?view=statements (R-ASST-06), read-only: my terms, this month so
 * far and my monthly statements, every amount in its own currency (never summed across them). The balance
 * and the commissions are «العمولات» (MyWallet).
 */
export function MyEarnings() {
  const earnings = useQuery(myEarningsQuery);
  const d = earnings.data;
  return (
    <>
      {earnings.isPending && <ListSkeleton />}
      {earnings.isError && (
        <FormAlert>
          {t.sales.loadFailed}{' '}
          <Button type="button" variant="secondary" size="sm" onClick={() => void earnings.refetch()}>
            {t.sales.retry}
          </Button>
        </FormAlert>
      )}
      {d && (
        <div className="grid gap-5">
          <EarningsTerms terms={d.terms} />
          <section aria-labelledby="month-title" className="grid gap-2 border-b border-rule pb-5">
            <h2 id="month-title" className="font-display text-h3 font-bold">
              {p.thisMonth}
            </h2>
            <CurrencyTotalsList totals={d.this_month} label={p.thisMonth} />
          </section>
          <section aria-labelledby="statements-title">
            <h2 id="statements-title" className="font-display text-h3 font-bold">
              {p.statements}
            </h2>
            {d.statements.length === 0 ? (
              <EmptyState title={p.statementsEmpty} className="mt-3">
                {p.statementsEmptyHint}
              </EmptyState>
            ) : (
              <ul>
                {d.statements.map((s) => (
                  <StatementCard key={s.id} statement={s} />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  );
}
