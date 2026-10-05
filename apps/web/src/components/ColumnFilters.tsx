import { useState } from 'react';
import { t } from '@/lib/i18n';
import { ColumnFilterText } from './ColumnFilterText';
import type { ColumnFilterDef } from './data-table-features';
import { Button } from './ui/button';
import { Select } from './ui/select';

/** One filter control above a table: the column's header text, its kind, value and setter. */
export interface ColumnFilterControl {
  id: string;
  label: string;
  filter: ColumnFilterDef;
  value: string;
  onChange: (value: string) => void;
}

/**
 * The filter row above a DataTable (also on phones, where stacked rows hide the head): a search
 * box or a select («الكل» = no filter) per filterable column, and «مسح التصفية» once any is set.
 */
export function ColumnFilters({ controls }: { controls: ColumnFilterControl[] }) {
  // Clearing remounts the search boxes, dropping a pending debounced keystroke.
  const [round, setRound] = useState(0);
  if (controls.length === 0) return null;
  const active = controls.some((c) => c.value !== '');
  const clear = () => {
    for (const c of controls) if (c.value !== '') c.onChange('');
    setRound((n) => n + 1);
  };

  return (
    <div className="mb-3 flex flex-wrap items-end gap-2">
      {controls.map((c) => {
        const ariaLabel = t.table.filterBy.replace('{col}', c.label);
        return (
          <label key={c.id} className="grid gap-0.5 text-2xs text-ink-3">
            <span aria-hidden="true">{c.label}</span>
            {c.filter.kind === 'text' ? (
              <ColumnFilterText key={round} ariaLabel={ariaLabel} value={c.value} onChange={c.onChange} />
            ) : (
              <Select
                aria-label={ariaLabel}
                value={c.value}
                onChange={(e) => c.onChange(e.target.value)}
                className="min-h-10 w-auto sm:min-h-9"
              >
                <option value="">{t.table.all}</option>
                {c.filter.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            )}
          </label>
        );
      })}
      {active && (
        <Button type="button" variant="ghost" size="sm" onClick={clear}>
          {t.table.clearFilters}
        </Button>
      )}
    </div>
  );
}
