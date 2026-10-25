import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/form/button';
import { EmptyState } from '@/components/ui/display/empty-state';
import { FormAlert } from '@/components/ui/form/form-alert';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { Amount } from '@/features/subscriptions/Amount';
import { t } from '@/lib/i18n';
import { myEarningsQuery } from './api';
import { CurrencyTotalsList } from './CurrencyTotalsList';
import { EarningsTerms } from './EarningsTerms';
import { StatementCard } from './StatementCard';

const p = t.assistantPortal.earnings;

/**
 * «أرباحي» on /sales/earnings (R-ASST-06; «مدفوعاتي» is the other view), read-only: my terms, this
 * month so far, the commissions I earned and my monthly statements, every amount in its own currency
 * (never summed across them).
 */
export function MyEarnings() {
  const earnings = useQuery(myEarningsQuery);
  const d = earnings.data;
  const commissions = Object.entries(d?.commissions_total ?? {}).sort(([a], [b]) => a.localeCompare(b));
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
            {commissions.length > 0 && (
              <p className="flex flex-wrap items-baseline gap-x-2 text-sm text-ink-2">
                {p.commissionsTotal}:
                {commissions.map(([currency, amount]) => (
                  <Amount key={currency} amount={amount} currency={currency} className="font-semibold" />
                ))}
              </p>
            )}
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
