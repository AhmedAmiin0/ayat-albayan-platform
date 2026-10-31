import type { SalesHistoryEntry } from '@ab/shared';
import { Ltr } from '@/components/ui/display/ltr';
import { formatDate } from '@/features/sales/leads';
import { Amount } from '@/features/finance/subscriptions/balance/Amount';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';

const STATUS: Record<string, string | undefined> = t.enums.subscriptionStatus;
const status = (s: string | null): string => (s ? (STATUS[s] ?? s) : '—');
const fill = (text: string, values: Record<string, string>): string =>
  Object.entries(values).reduce((out, [k, v]) => out.replace(`{${k}}`, v), text);

/** One subscription in the history: package, status, dates, lessons, status changes and payments (date, kind, amount). */
export function HistoryEntryCard({ entry, current }: { entry: SalesHistoryEntry; current: boolean }) {
  const h = t.sales.history;
  return (
    <li className={cn('grid gap-2 rounded-md border border-rule bg-page p-4', current && 'border-lapis')}>
      <p className="flex flex-wrap items-baseline gap-x-3 font-semibold">
        <span>{entry.package ?? '—'}</span>
        <span className="text-ink-2">{status(entry.status)}</span>
        {current && <span className="text-xs text-lapis">{h.current}</span>}
      </p>
      <p className="flex flex-wrap gap-x-4 text-sm text-ink-2">
        <span>{fill(h.starts, { date: '' })}<Ltr className="tabular-nums">{entry.starts_on}</Ltr></span>
        {entry.renews_on && <span>{fill(h.renews, { date: '' })}<Ltr className="tabular-nums">{entry.renews_on}</Ltr></span>}
        {entry.ended_at && <span>{fill(h.ended, { date: formatDate(entry.ended_at) })}</span>}
      </p>
      <p className="text-sm tabular-nums">
        {fill(h.used, { used: String(entry.lessons_used), total: String(entry.lessons_total) })} ·{' '}
        {fill(h.remaining, { n: String(entry.lessons_remaining) })}
      </p>
      <div className="grid gap-1 text-sm">
        <p className="text-xs font-semibold text-ink-3">{h.changes}</p>
        {entry.status_changes.length === 0 && <p className="text-ink-3">{h.noChanges}</p>}
        <ul>
          {entry.status_changes.map((c) => (
            <li key={c.at}>
              {formatDate(c.at)} — {c.from ? fill(h.changed, { from: status(c.from), to: status(c.to) }) : fill(h.created, { to: status(c.to) })}
            </li>
          ))}
        </ul>
      </div>
      <div className="grid gap-1 text-sm">
        <p className="text-xs font-semibold text-ink-3">{h.payments}</p>
        {entry.payments.length === 0 && <p className="text-ink-3">{h.noPayments}</p>}
        <ul>
          {entry.payments.map((p) => (
            <li key={p.id}>
              {formatDate(p.paid_at)} — {t.enums.paymentKind[p.kind]} — <Amount amount={p.amount} currency={p.currency} />
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}
