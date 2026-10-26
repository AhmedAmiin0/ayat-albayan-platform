import { LEAD_SOURCES, NO_ASSIGNEE } from '@ab/shared';
import { SelectFilterField } from '@/components/table-toolbar/fields';
import { t } from '@/lib/i18n/i18n';
import { leadSortChoices, leadSortFromValue, leadSortValue } from './lead-sort';
import type { LeadChipsOptions } from './lead-filters';

/**
 * The inbox's own filters in the shared «تصفية» panel (R-LEAD-05, R-NFR-08, server-side): the source,
 * «مسؤول المبيعات» and the order. The card list has no column heads to sort by, so the order is a field.
 */
export function LeadFilterFields({ search, people, onFilter }: LeadChipsOptions) {
  return (
    <>
      <SelectFilterField
        label={t.leads.source}
        value={search.source}
        options={[{ value: '', label: t.leads.sourceAll }, ...LEAD_SOURCES.map((s) => ({ value: s, label: t.enums.leadSource[s] }))]}
        onChange={(source) => onFilter({ source })}
      />
      <SelectFilterField
        label={t.sales.assign.label}
        value={search.assignee}
        options={[
          { value: '', label: t.leads.assigneeAll },
          { value: NO_ASSIGNEE, label: t.sales.assign.none },
          ...people.map((p) => ({ value: p.id, label: p.name })),
        ]}
        onChange={(assignee) => onFilter({ assignee })}
      />
      <SelectFilterField
        label={t.leads.sortBy}
        value={leadSortValue(search)}
        options={leadSortChoices()}
        onChange={(value) => onFilter({ sort: undefined, dir: undefined, ...leadSortFromValue(value) })}
      />
    </>
  );
}
