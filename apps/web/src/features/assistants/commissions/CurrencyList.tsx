import { Amount } from '@/features/subscriptions/Amount';
import { cn } from '@/lib/utils';

type Props = { totals: Readonly<Record<string, number>>; className?: string };

/** One amount per currency, one line each (SAR and EGP are never added together). */
export function CurrencyList({ totals, className }: Props) {
  const entries = Object.entries(totals).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return <span className="text-ink-3">—</span>;
  return (
    <ul className={cn('grid gap-0.5', className)}>
      {entries.map(([currency, amount]) => (
        <li key={currency}>
          <Amount amount={amount} currency={currency} className="font-semibold" />
        </li>
      ))}
    </ul>
  );
}
