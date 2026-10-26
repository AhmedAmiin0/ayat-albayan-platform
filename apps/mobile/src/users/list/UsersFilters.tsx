import { USER_ROLES, USER_STATUSES } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { FilterPills } from '@/core/ui/form/FilterPills';
import type { UsersView } from '../shared/api';
import { roleText, statusStyle } from '../shared/format';

interface UsersFiltersProps {
  view: UsersView;
  onChange: (next: UsersView) => void;
}

/** The web's role and status filters as two chip rows; «الكل» clears one. A change reloads from page 1. */
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
