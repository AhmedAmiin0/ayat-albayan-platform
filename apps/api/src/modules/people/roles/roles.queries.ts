import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../common/db/db.module';
import { dbError } from '../../../common/http/http';
import type { NewRole, ProfileRecord, RoleNames, RoleRecord, RoleStore } from './roles.store';

/**
 * RoleStore on the service-role client (roles / role_permissions are API-written only, migration
 * 20261005000220; migration 225 keeps clients off profiles.role / role_id too).
 */
@Injectable()
export class RolesQueries implements RoleStore {
  constructor(@Inject(DB) private readonly db: Db) {}

  async roles(): Promise<RoleRecord[]> {
    const { data, error } = await this.db
      .from('roles')
      .select('id, key, name_ar, name_en, base_role, is_system, role_permissions(permission)')
      .order('is_system', { ascending: false })
      .order('created_at');
    if (error) throw dbError(error);
    return data.map(({ role_permissions, ...r }) => ({ ...r, permissions: role_permissions.map((p) => p.permission) }));
  }

  async profiles(): Promise<ProfileRecord[]> {
    const { data, error } = await this.db
      .from('profiles')
      .select('id, full_name, role, role_id')
      .not('role', 'in', '(guardian,student)')
      .order('full_name');
    if (error) throw dbError(error);
    return data;
  }

  async insertRole(row: NewRole): Promise<string> {
    const { data, error } = await this.db.from('roles').insert(row).select('id').single();
    if (error) throw dbError(error);
    return data.id;
  }

  async renameRole(id: string, names: RoleNames): Promise<void> {
    if (names.name_ar === undefined && names.name_en === undefined) return;
    const { error } = await this.db.from('roles').update(names).eq('id', id);
    if (error) throw dbError(error);
  }

  /** One transaction (set_role_permissions, service role only): never a half-written grant set. */
  async setPermissions(id: string, permissions: readonly string[]): Promise<void> {
    const { error } = await this.db.rpc('set_role_permissions', { role_id: id, perms: [...permissions] });
    if (error) throw dbError(error);
  }

  async deleteRole(id: string): Promise<void> {
    const { error } = await this.db.from('roles').delete().eq('id', id);
    if (error) throw dbError(error);
  }

  async setProfileRole(id: string, change: { role: ProfileRecord['role']; role_id: string | null }): Promise<void> {
    const { error } = await this.db.from('profiles').update(change).eq('id', id);
    if (error) throw dbError(error);
  }
}
