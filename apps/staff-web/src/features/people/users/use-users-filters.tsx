import { USER_STATUSES } from '@ab/shared';
import { USER_ROLES } from '@ab/catalog';
import type { FilterOption } from '@/components/data-table/data-table-features';
import { SelectFilterField } from '@/components/table-toolbar/fields';
import type { ExtraFilters, FilterChip } from '@/components/table-toolbar/types';
import { t } from '@ab/web-kit';
import type { UsersPageView } from './api';

const F = t.users.filters;
const ROLE_OPTIONS: FilterOption[] = [{ value: '', label: F.all }, ...USER_ROLES.map((r) => ({ value: r, label: t.activity.roles[r] }))];
const STATUS_OPTIONS: FilterOption[] = [{ value: '', label: F.all }, ...USER_STATUSES.map((s) => ({ value: s, label: t.users.status[s] }))];

/** Role and status as the table toolbar's extra filters (fields in the panel, chips under the bar). */
export function usersFilters(
  view: UsersPageView,
  onChange: (next: UsersPageView) => void,
): ExtraFilters {
  const set = (patch: Partial<UsersPageView>) => onChange({ ...view, ...patch, page: 1 });
  const chips: FilterChip[] = [];
  const role = ROLE_OPTIONS.find((o) => o.value === view.role && o.value);
  const status = STATUS_OPTIONS.find((o) => o.value === view.status && o.value);
  if (role) chips.push({ id: 'role', label: F.role, value: role.label, onRemove: () => set({ role: '' }) });
  if (status) chips.push({ id: 'status', label: F.status, value: status.label, onRemove: () => set({ status: '' }) });
  return {
    fields: (
      <>
        <SelectFilterField label={F.role} value={view.role} options={ROLE_OPTIONS} onChange={(role) => set({ role })} />
        <SelectFilterField label={F.status} value={view.status} options={STATUS_OPTIONS} onChange={(status) => set({ status })} />
      </>
    ),
    chips,
    onClearAll: () => set({ role: '', status: '' }),
  };
}
