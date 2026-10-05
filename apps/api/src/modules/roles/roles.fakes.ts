import { defaultGrantsOf, USER_ROLES } from '@ab/shared';
import type { NewRole, ProfileRecord, RoleNames, RoleRecord, RoleStore } from './roles.store';

/** The five system roles as migration 20261005000220 seeds them, ids 'sys-<key>'. */
export function systemRoles(): RoleRecord[] {
  return USER_ROLES.map((key) => ({
    id: `sys-${key}`,
    key,
    name_ar: key,
    name_en: null,
    base_role: key,
    is_system: true,
    permissions: defaultGrantsOf(key),
  }));
}

/** In-memory RoleStore for the service tests. */
export class FakeRoleStore implements RoleStore {
  private seq = 0;

  constructor(
    public rolesData: RoleRecord[] = systemRoles(),
    public profilesData: ProfileRecord[] = [],
  ) {}

  async roles(): Promise<RoleRecord[]> {
    return this.rolesData.map((r) => ({ ...r, permissions: [...r.permissions] }));
  }

  async profiles(): Promise<ProfileRecord[]> {
    return this.profilesData.filter((p) => p.role !== 'guardian').map((p) => ({ ...p }));
  }

  async insertRole(row: NewRole): Promise<string> {
    this.seq += 1;
    const id = `00000000-0000-4000-8000-${String(this.seq).padStart(12, '0')}`;
    this.rolesData.push({ ...row, id, is_system: false, permissions: [] });
    return id;
  }

  async renameRole(id: string, names: RoleNames): Promise<void> {
    this.rolesData = this.rolesData.map((r) =>
      r.id === id ? { ...r, name_ar: names.name_ar ?? r.name_ar, name_en: names.name_en === undefined ? r.name_en : names.name_en } : r,
    );
  }

  async setPermissions(id: string, permissions: readonly string[]): Promise<void> {
    this.rolesData = this.rolesData.map((r) => (r.id === id ? { ...r, permissions: [...permissions] } : r));
  }

  async deleteRole(id: string): Promise<void> {
    this.rolesData = this.rolesData.filter((r) => r.id !== id);
  }

  async setProfileRole(id: string, change: { role: ProfileRecord['role']; role_id: string | null }): Promise<void> {
    this.profilesData = this.profilesData.map((p) => (p.id === id ? { ...p, ...change } : p));
  }
}

export const profile = (id: string, role: ProfileRecord['role'], role_id: string | null = null): ProfileRecord => ({
  id,
  full_name: id,
  role,
  role_id,
});
