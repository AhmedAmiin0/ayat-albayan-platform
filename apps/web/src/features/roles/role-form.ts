import { permissionGroups, type Permission, type RoleCreate, type RoleUpdate, type RoleView, type StaffRole } from '@ab/shared';

// The role dialog's state and its pure edits: one checkbox per permission, «تحديد الكل» per area.

export interface RoleForm {
  name_ar: string;
  name_en: string;
  base_role: StaffRole;
  permissions: Permission[];
}

export function roleForm(role: RoleView | null): RoleForm {
  if (!role) return { name_ar: '', name_en: '', base_role: 'admin', permissions: [] };
  const base = role.base_role === 'guardian' ? 'admin' : role.base_role;
  return { name_ar: role.name_ar, name_en: role.name_en ?? '', base_role: base, permissions: [...role.permissions] };
}

/** Catalog order, no duplicates. */
function ordered(set: ReadonlySet<Permission>): Permission[] {
  return permissionGroups().flatMap((g) => g.keys).filter((p) => set.has(p));
}

export function togglePermission(form: RoleForm, permission: Permission): RoleForm {
  const set = new Set(form.permissions);
  if (set.has(permission)) set.delete(permission);
  else set.add(permission);
  return { ...form, permissions: ordered(set) };
}

export type GroupState = 'all' | 'some' | 'none';

export function groupState(permissions: readonly Permission[], keys: readonly Permission[]): GroupState {
  const held = keys.filter((k) => permissions.includes(k)).length;
  if (held === 0) return 'none';
  return held === keys.length ? 'all' : 'some';
}

/** «تحديد الكل»: selects the whole area, or clears it when it is already all selected. */
export function toggleGroup(form: RoleForm, keys: readonly Permission[]): RoleForm {
  const set = new Set(form.permissions);
  const all = groupState(form.permissions, keys) === 'all';
  for (const k of keys) {
    if (all) set.delete(k);
    else set.add(k);
  }
  return { ...form, permissions: ordered(set) };
}

export type RoleBody = { ok: true; body: RoleCreate | RoleUpdate } | { ok: false; error: 'name_required' };

/** POST body for a new role; PATCH body (names + grants, never the base role) for an existing one. */
export function roleBody(form: RoleForm, input: { creating: boolean; fixedGrants: boolean }): RoleBody {
  const name_ar = form.name_ar.trim();
  if (!name_ar) return { ok: false, error: 'name_required' };
  const name_en = form.name_en.trim() || null;
  if (input.creating) return { ok: true, body: { name_ar, name_en, base_role: form.base_role, permissions: form.permissions } };
  return { ok: true, body: input.fixedGrants ? { name_ar, name_en } : { name_ar, name_en, permissions: form.permissions } };
}
