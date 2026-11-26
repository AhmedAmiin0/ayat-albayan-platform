import { NO_ASSIGNEE } from '@ab/shared';
import { LEAD_SOURCES } from '@ab/catalog';
import { SelectFilterField } from '@/components/table-toolbar/fields';
import { t } from '@ab/web-kit';
import { leadSortFromValue, leadSortValue } from '@ab/client-core';
import { leadSortChoices } from './lead-sort';
import type { LeadChipsOptions } from './lead-filters';

/** Server-side filters (R-LEAD-05, R-NFR-08); cards have no column heads, so order is a field. */
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
        onChange={(value) =>
          onFilter({ sort: undefined, dir: undefined, ...leadSortFromValue(value) })
        }
      />
    </>
  );
}
