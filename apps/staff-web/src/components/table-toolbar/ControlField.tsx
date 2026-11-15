import { t } from '@/lib/i18n/i18n';
import { ColumnFilterText } from '@/components/data-table/ColumnFilterText';
import { Select } from '@/components/ui/form/select';
import type { ColumnFilterControl } from './types';

/** «تصفية حسب {col}»: every filter control's accessible name (the panel and the search box). */
export const filterByLabel = (label: string) => t.table.filterBy.replace('{col}', label);

/** A column filter as a labelled field in the panel: a search box, or a select with «الكل». */
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
