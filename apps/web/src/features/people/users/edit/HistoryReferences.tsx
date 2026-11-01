import type { UserReference } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { tableLabel } from '@/features/people/users/errors';

/** The tables that keep a user from being deleted, with how many rows each holds. */
export function HistoryReferences({ references }: { references: readonly UserReference[] }) {
  return (
    <div className="grid gap-2">
      <p className="text-sm text-ink">{t.users.delete.blocked}</p>
      <ul className="grid gap-1 text-sm">
        {references.map((r) => (
          <li key={`${r.table}.${r.column}`} className="flex items-baseline justify-between gap-3 border-b border-rule py-1.5 last:border-0">
            <span className="text-ink">{tableLabel(r.table)}</span>
            <span className="tabular-nums text-ink-3">{r.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
