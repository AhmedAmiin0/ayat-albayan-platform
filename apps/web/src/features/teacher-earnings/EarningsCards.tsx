import type { TeacherEarningsBalanceView } from '@ab/shared';
import { Amount } from '@/features/subscriptions/Amount';
import { moneyText } from '@/features/subscriptions/format';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type CardProps = { label: string; amount: number; hint?: string; strong?: boolean };

function Card({ label, amount, hint, strong }: CardProps) {
  return (
    <div className={cn('grid content-start gap-1 rounded-md border border-rule bg-surface px-4 py-3.5', strong && 'border-gold-soft')}>
      <span className="text-xs text-ink-3">{label}</span>
      <Amount amount={amount} currency="EGP" className="text-2xl font-semibold text-ink" />
      {hint && <span className="text-2xs text-ink-3">{hint}</span>}
    </div>
  );
}

/** «إجمالي المستحق | اللي اتدفع | المتبقي» (earned, paid, outstanding) for one teacher. */
export function EarningsCards({ balance }: { balance: TeacherEarningsBalanceView }) {
  const count = (key: 'sessionsCount' | 'unpaidCount', n: number) => t.earnings[key].replace('{count}', String(n));
  return (
    <section aria-label={t.earnings.sessions} className="mb-5 grid gap-3 sm:grid-cols-3">
      <Card label={t.earnings.earned} amount={balance.earned} hint={count('sessionsCount', balance.sessions)} />
      <Card label={t.earnings.paid} amount={balance.paid} />
      <Card
        strong
        label={t.earnings.outstanding}
        amount={balance.outstanding}
        hint={
          balance.overpaid > 0
            ? t.earnings.overpaid.replace('{amount}', moneyText(balance.overpaid, 'EGP'))
            : count('unpaidCount', balance.unpaid_sessions)
        }
      />
    </section>
  );
}
