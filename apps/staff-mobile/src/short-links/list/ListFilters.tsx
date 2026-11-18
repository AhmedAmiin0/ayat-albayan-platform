import { SHORT_LINK_STATUSES, type ShortLinkStatus } from '@ab/shared';
import { t, FilterPills } from '@ab/mobile-kit';

export type StatusPill = 'all' | ShortLinkStatus;
export type OwnerPill = 'all' | 'mine';

export interface ListView {
  status: StatusPill;
  owner: OwnerPill;
  search: string;
}

export const FIRST_VIEW: ListView = { status: 'all', owner: 'all', search: '' };

interface ListFiltersProps {
  view: ListView;
  onChange: (view: ListView) => void;
  /** short_links.all: «كل الموظفين» / «روابطي». */
  owners: boolean;
}

const statusPills = () => [
  { value: 'all' as const, label: t.shortLinks.list.all },
  ...SHORT_LINK_STATUSES.map((s) => ({ value: s, label: t.shortLinks.state[s] })),
];

const ownerPills = () => [
  { value: 'all' as const, label: t.shortLinks.list.allStaff },
  { value: 'mine' as const, label: t.shortLinks.list.mine },
];

/** The state pills and, for whoever sees every link, the owner pills (board LinkXStaffList). */
export function ListFilters({ view, onChange, owners }: ListFiltersProps) {
  return (
    <>
      <FilterPills<StatusPill>
        items={statusPills()}
        value={view.status}
        onChange={(status) => onChange({ ...view, status })}
        accessibilityLabel={t.shortLinks.list.status}
      />
      {owners ? (
        <FilterPills<OwnerPill>
          items={ownerPills()}
          value={view.owner}
          onChange={(owner) => onChange({ ...view, owner })}
          accessibilityLabel={t.shortLinks.list.owner}
        />
      ) : null}
    </>
  );
}
