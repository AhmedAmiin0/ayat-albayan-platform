import type { Permission } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { dbError } from '../teachers/http';
import type { RoleRow } from './roles.mapper';

interface NewRole {
  key: string;
  name_ar: string;
  name_en: string;
  base_role: RoleRow['base_role'];
}

/** Service-role reads and writes of roles / role_permissions / v_role_user_counts. */
@Injectable()
export class RolesQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async roles(): Promise<RoleRow[]> {
    const { data, error } = await this.db
      .from('roles')
      .select('*')
      .order('is_system', { ascending: false })
      .order('name_en');
    if (error) throw dbError(error);
    return data;
  }

  async role(id: string): Promise<RoleRow | null> {
    const { data, error } = await this.db.from('roles').select('*').eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** role id → permissions. */
  async permissions(): Promise<Map<string, string[]>> {
    const { data, error } = await this.db.from('role_permissions').select('role_id, permission');
    if (error) throw dbError(error);
    const out = new Map<string, string[]>();
    for (const r of data) out.set(r.role_id, [...(out.get(r.role_id) ?? []), r.permission]);
    return out;
  }

  /** role id → number of users holding it. */
  async userCounts(): Promise<Map<string, number>> {
    const { data, error } = await this.db.from('v_role_user_counts').select('role_id, user_count');
    if (error) throw dbError(error);
    return new Map(data.flatMap((r) => (r.role_id ? [[r.role_id, r.user_count ?? 0] as const] : [])));
  }

  async insert(role: NewRole): Promise<RoleRow> {
    const { data, error } = await this.db.from('roles').insert({ ...role, is_system: false }).select('*').single();
    if (error) throw dbError(error);
    return data;
  }

  async update(id: string, patch: Partial<NewRole>): Promise<void> {
    if (Object.keys(patch).length === 0) return;
    const { error } = await this.db.from('roles').update(patch).eq('id', id);
    if (error) throw dbError(error);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.db.from('roles').delete().eq('id', id);
    if (error) throw dbError(error);
  }

  async addPermissions(roleId: string, perms: readonly Permission[]): Promise<void> {
    if (perms.length === 0) return;
    const rows = perms.map((permission) => ({ role_id: roleId, permission }));
    const { error } = await this.db.from('role_permissions').insert(rows);
    if (error) throw dbError(error);
  }

  async removePermissions(roleId: string, perms: readonly string[]): Promise<void> {
    if (perms.length === 0) return;
    const { error } = await this.db.from('role_permissions').delete().eq('role_id', roleId).in('permission', [...perms]);
    if (error) throw dbError(error);
  }
}
