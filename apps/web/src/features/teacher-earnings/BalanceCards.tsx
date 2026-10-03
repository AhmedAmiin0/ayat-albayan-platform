import type { TeacherBalance } from '@ab/shared';
import { Amount } from '@/features/subscriptions/Amount';
import { t } from '@/lib/i18n';

/** Earned / paid / outstanding in EGP, with the outstanding one carrying the weight. */
export function BalanceCards({ balance }: { balance: TeacherBalance }) {
  const tt = t.teacherEarnings;
  const cards = [
    { key: 'earned', label: tt.earned, amount: balance.earned, strong: false },
    { key: 'paid', label: tt.paid, amount: balance.paid, strong: false },
    { key: 'outstanding', label: tt.outstanding, amount: balance.outstanding, strong: true },
  ];
  return (
    <dl className="mb-6 grid gap-3 sm:grid-cols-3" data-testid="balance-cards">
      {cards.map((c) => (
        <div key={c.key} className="grid gap-1 border-b border-rule pb-3 sm:border-b-0 sm:border-s sm:ps-4 sm:pb-0 first:sm:border-s-0 first:sm:ps-0">
          <dt className="text-xs text-ink-3">{c.label}</dt>
          <dd className={c.strong ? 'text-xl font-bold text-ink' : 'text-lg text-ink-2'}>
            <Amount amount={c.amount} currency={balance.currency} />
          </dd>
        </div>
      ))}
      <p className="text-xs text-ink-3 sm:col-span-3">{tt.sessionsCount.replace('{n}', String(balance.sessions))}</p>
    </dl>
  );
}
