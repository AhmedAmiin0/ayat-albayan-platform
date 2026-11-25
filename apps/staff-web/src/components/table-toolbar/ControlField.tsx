import { t, Select } from '@ab/web-kit';
import { ColumnFilterText } from '@/components/data-table/ColumnFilterText';
import type { ColumnFilterControl } from './types';

export const filterByLabel = (label: string) => t.table.filterBy.replace('{col}', label);

export function ControlField({ control: c }: { control: ColumnFilterControl }) {
  const ariaLabel = filterByLabel(c.label);
  return (
    <label className="grid content-start gap-1.5">
      <span aria-hidden="true" className="text-xs font-semibold text-ink-2">
        {c.label}
      </span>
      {c.filter.kind === 'text' ? (
        <ColumnFilterText ariaLabel={ariaLabel} value={c.value} onChange={c.onChange} className="w-full" />
      ) : (
        <Select aria-label={ariaLabel} value={c.value} onChange={(e) => c.onChange(e.target.value)}>
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
}
