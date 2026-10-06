import type { AssistantTermsView } from '@ab/shared';
import { formatDate } from '@/features/leads/format';
import { moneyText } from '@/features/subscriptions/format';
import { t } from '@/lib/i18n';

const p = t.assistantPortal.earnings;

/** «شروطي»: my monthly salary and my commission, as the administration set them. Read-only. */
export function EarningsTerms({ terms }: { terms: AssistantTermsView | null }) {
  const { salary, commission } = terms ?? { salary: null, commission: null };
  return (
    <section aria-labelledby="terms-title" className="grid gap-2 border-b border-rule pb-5">
      <h2 id="terms-title" className="font-display text-h3 font-bold">
        {p.terms}
      </h2>
      {!salary && !commission && <p className="text-sm text-ink-2">{p.noTerms}</p>}
      {salary && (
        <p className="text-sm">
          <span className="font-semibold">{p.salary}: </span>
          {p.salaryFrom.replace('{amount}', moneyText(salary.amount, salary.currency)).replace('{date}', formatDate(salary.starts_on))}
        </p>
      )}
      {commission && (
        <p className="text-sm">
          <span className="font-semibold">{p.commission}: </span>
          {commission.type === 'percent'
            ? p.commissionPercent.replace('{value}', String(commission.value))
            : p.commissionFixed.replace('{amount}', moneyText(commission.value, commission.currency ?? ''))}
          <span className="mt-0.5 block text-xs text-ink-3">{p.commissionNote.replace('{date}', formatDate(commission.starts_on))}</span>
        </p>
      )}
      {terms && !commission && salary && <p className="text-xs text-ink-3">{p.noCommission}</p>}
    </section>
  );
}
