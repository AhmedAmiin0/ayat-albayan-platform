import {
  LINK_STATUS_TABS, linkStatusOf, type LinkOwner, type LinkStatusTab,
} from '@ab/client-core';
import { useId } from 'react';
import { ColumnFilterText } from '@/components/data-table/ColumnFilterText';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { SegmentedControl } from '@ab/web-kit/components/ui/form/segmented-control';
import { Select } from '@ab/web-kit/components/ui/form/select';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import {
  isFiltered, type LinkListSearch,
} from '@/features/platform/short-links/shared/link-routes';

const L = t.shortLinks.list;

const TAB_LABEL: Readonly<Record<LinkStatusTab, string>> = {
  all: L.all,
  active: t.shortLinks.state.active,
  expired: t.shortLinks.state.expired,
  revoked: t.shortLinks.state.revoked,
};

interface ListFiltersProps {
  search: LinkListSearch;
  onSearch: (next: LinkListSearch) => void;
  counts: Partial<Record<LinkStatusTab, number>>;
  /** The owner filter's people (client-core ownerChoices, short_links.all); null hides it. */
  owners: LinkOwner[] | null;
}

function OwnerSelect({ search, onSearch, owners }: Omit<ListFiltersProps, 'counts'>) {
  const id = useId();
  if (owners === null) return null;
  return (
    <div className="grid min-w-[200px] flex-1 gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">{L.owner}</label>
      <Select
        id={id}
        value={search.owner ?? ''}
        onChange={(e) => onSearch({ ...search, owner: e.target.value || undefined, page: 1 })}
      >
        <option value="">{L.allOwners}</option>
        {owners.map((o) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </Select>
    </div>
  );
}

export function ListFilters({ search, onSearch, counts, owners }: ListFiltersProps) {
  const tab: LinkStatusTab = search.status ?? 'all';
  const options = LINK_STATUS_TABS.map((value) => ({
    value,
    label: TAB_LABEL[value],
    count: counts[value],
  }));
  const pick = (next: LinkStatusTab) =>
    onSearch({ ...search, status: linkStatusOf(next).status, page: 1 });
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid min-w-[240px] flex-[2] gap-1.5">
          <span aria-hidden="true" className="text-sm font-semibold">{L.search}</span>
          <ColumnFilterText
            ariaLabel={L.search}
            placeholder={L.searchPlaceholder}
            value={search.q ?? ''}
            onChange={(q) => onSearch({ ...search, q: q || undefined, page: 1 })}
          />
        </div>
        <OwnerSelect search={search} onSearch={onSearch} owners={owners} />
        {isFiltered(search) && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onSearch({})}>
            {L.clearFilters}
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold">{L.status}</span>
        <SegmentedControl label={L.status} options={options} value={tab} onChange={pick} />
      </div>
    </div>
  );
}
