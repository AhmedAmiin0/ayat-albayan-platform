import { formatDate } from '@/features/sales/leads/format';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import type { StudentBalanceView, SubscriptionView } from '../api';
import { moneyText, packageName, studentProgress } from '../format';
import { partPaidText } from '../payment-lines';

/** «الباقة خلصت يوم …» once used up, else «متوقع تخلص يوم …» from the booked lessons (R-SUB-03). */
export function endLine(s: SubscriptionView): string {
  if (s.balance.ended_at) return t.subscriptions.endedAt.replace('{date}', formatDate(s.balance.ended_at));
  if (s.balance.projected_end_at)
    return t.subscriptions.projectedEnd.replace('{date}', formatDate(s.balance.projected_end_at));
  return t.subscriptions.noProjection;
}

/** The package line across every package, then the current package: used, paid, end date. */
export function BalanceDetails({ view, current }: { view: StudentBalanceView; current: SubscriptionView }) {
  const progress = studentProgress(view);
  const used = t.subscriptions.usedOf
    .replace('{used}', String(current.balance.lessons_used))
    .replace('{total}', String(current.lessons_total));
  const paid = t.payments.paidOf
    .replace('{paid}', moneyText(current.paid, current.currency))
    .replace('{price}', moneyText(current.price, current.currency));
  const part = partPaidText(current);
  return (
    <>
      <p className={cn('text-lg font-semibold', progress.tone === 'act' ? 'text-act' : 'text-ink')}>
        {progress.remainingLabel}
      </p>
      <p className="text-sm text-ink-2">{[packageName(current), used, paid].join(' · ')}</p>
      {part && <p className="text-sm font-semibold text-act">{part}</p>}
      <p className="text-xs text-ink-3">{endLine(current)}</p>
    </>
  );
}
