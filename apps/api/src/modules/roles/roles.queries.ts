import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { dbError } from '../teachers/http';
import type { NewRole, ProfileRecord, RoleNames, RoleRecord, RoleStore } from './roles.store';

/**
 * RoleStore on the service-role client (roles / role_permissions are API-written only, migration
 * 20261005000220). ponytail: setPermissions is delete-then-insert, not one transaction; a failure
 * between the two leaves the role with fewer grants (fail closed) and the admin saves again.
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
      .neq('role', 'guardian')
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

  async setPermissions(id: string, permissions: readonly string[]): Promise<void> {
    const del = await this.db.from('role_permissions').delete().eq('role_id', id);
    if (del.error) throw dbError(del.error);
    if (permissions.length === 0) return;
    const rows = permissions.map((permission) => ({ role_id: id, permission }));
    const { error } = await this.db.from('role_permissions').insert(rows);
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
