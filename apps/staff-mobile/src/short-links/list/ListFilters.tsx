import {
  LINK_STATUS_TABS, type LinkOwner, type LinkStatusTab, type OwnerPick,
} from '@ab/client-core';
import { t, FilterPills } from '@ab/mobile-kit';

export interface ListView {
  status: LinkStatusTab;
  /** `all`, `mine` or an owner's profile id. */
  owner: OwnerPick;
  search: string;
}

export const FIRST_VIEW: ListView = { status: 'all', owner: 'all', search: '' };

interface ListFiltersProps {
  view: ListView;
  onChange: (view: ListView) => void;
  /** short_links.all: the other owners on the loaded rows (ownerChoices); null hides the pills. */
  owners: LinkOwner[] | null;
}

const L = () => t.shortLinks.list;

const statusPills = () =>
  LINK_STATUS_TABS.map((s) => ({ value: s, label: s === 'all' ? L().all : t.shortLinks.state[s] }));

const ownerPills = (owners: LinkOwner[]) => [
  { value: 'all', label: L().allStaff },
  { value: 'mine', label: L().mine },
  ...owners.map((o) => ({ value: o.id, label: o.name })),
];

/** The state pills and, for whoever sees every link, the owner pills (board LinkXStaffList). */
export function ListFilters({ view, onChange, owners }: ListFiltersProps) {
  return (
    <>
      <FilterPills<LinkStatusTab>
        items={statusPills()}
        value={view.status}
        onChange={(status) => onChange({ ...view, status })}
        accessibilityLabel={L().status}
      />
      {owners ? (
        <FilterPills<OwnerPick>
          items={ownerPills(owners)}
          value={view.owner}
          onChange={(owner) => onChange({ ...view, owner })}
          accessibilityLabel={L().owner}
        />
      ) : null}
    </>
  );
}
