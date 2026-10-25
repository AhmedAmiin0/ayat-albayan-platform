import { Field } from '@/components/ui/form/field';
import { Select } from '@/components/ui/form/select';
import { currentMonth } from '@/features/payouts/api';
import { monthLabel, monthOptions } from '@/features/payouts/MonthSelect';
import { t } from '@/lib/i18n';
import type { AssistantRow } from './api';

export type Filter<S extends string> = { assistantId: string; month: string; status: '' | S };
type Props<S extends string> = {
  value: Filter<S>;
  onChange: (next: Filter<S>) => void;
  statuses: readonly { value: S; label: string }[];
  /** Hidden on an assistant's own page. */
  assistants?: readonly AssistantRow[] | undefined;
  /** Statements need one month; the ledger can span all. */
  anyMonth?: boolean;
  label: string;
};

const L = t.assistants.ledger;

/** Assistant, month and status selects (native, rule 6) shared by the ledger and the statements. */
export function FilterBar<S extends string>({ value, onChange, statuses, assistants, anyMonth, label }: Props<S>) {
  const set = (patch: Partial<Filter<S>>) => onChange({ ...value, ...patch });
  const latest = currentMonth();
  return (
    <div role="group" aria-label={label} className="mb-4 flex flex-wrap items-end gap-3">
      {assistants && (
        <Field label={L.assistant}>
          {(p) => (
            <Select {...p} className="w-auto" value={value.assistantId} onChange={(e) => set({ assistantId: e.target.value })}>
              <option value="">{L.allAssistants}</option>
              {assistants.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}
      <Field label={L.month}>
        {(p) => (
          <Select {...p} className="w-auto" value={value.month} onChange={(e) => set({ month: e.target.value })}>
            {anyMonth && <option value="">{L.allMonths}</option>}
            {monthOptions(latest, { count: 24, value: value.month || latest }).map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={L.statusLabel}>
        {(p) => (
          <Select {...p} className="w-auto" value={value.status} onChange={(e) => set({ status: e.target.value as '' | S })}>
            <option value="">{L.allStatuses}</option>
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
    </div>
  );
}
