import { Ltr } from '@/components/ui/ltr';
import { t } from '@/lib/i18n';
import type { SalesSubscription } from './api';

const STATUS: Record<string, string | undefined> = t.enums.subscriptionStatus;

/** One subscription: student and code, package, status, lessons and start date. Never a price. */
export function SubscriptionRow({ subscription: s }: { subscription: SalesSubscription }) {
  const s2 = t.sales.subscriptions;
  const facts = [
    s.package,
    STATUS[s.status] ?? s.status,
    s2.lessons.replace('{n}', String(s.lessons_total)),
  ];
  return (
    <li className="grid gap-0.5 border-b border-rule py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold">{s.student.name}</span>
        <Ltr className="text-sm text-ink-2">{s.student.code}</Ltr>
      </div>
      <p className="text-sm text-ink-2">{facts.join(' · ')}</p>
      {s.starts_on && (
        <p className="text-xs text-ink-3">
          {s2.startsOn.split('{date}')[0]}
          <Ltr>{s.starts_on}</Ltr>
        </p>
      )}
    </li>
  );
}
