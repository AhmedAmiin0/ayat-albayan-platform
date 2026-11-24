import { USER_STATUSES } from '@ab/shared';
import { USER_ROLES } from '@ab/catalog';
import { t, FilterPills } from '@ab/mobile-kit';
import { roleText, statusStyle } from '@/users/shared/format';
import type { UsersView } from '@ab/client-core';

interface UsersFiltersProps {
  view: UsersView;
  onChange: (next: UsersView) => void;
}

/** A change reloads from page 1. */
export function UsersFilters({ view, onChange }: UsersFiltersProps) {
  const all = { value: '', label: t.users.filters.all };
  const roles = [all, ...USER_ROLES.map((r) => ({ value: r, label: roleText(r) }))];
  const statuses = [all, ...USER_STATUSES.map((s) => ({ value: s, label: t.users.status[s], ...statusStyle(s) }))];
  return (
    <>
      <FilterPills
        items={roles}
        value={view.role}
        onChange={(role) => onChange({ ...view, role })}
        accessibilityLabel={t.mobileUsers.roleFilter}
      />
      <FilterPills
        items={statuses}
        value={view.status}
        onChange={(status) => onChange({ ...view, status })}
        accessibilityLabel={t.mobileUsers.statusFilter}
      />
    </>
  );
}
