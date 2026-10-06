import type { UsersListQuery } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { dbError } from '../teachers/http';
import * as links from './users.links.queries';
import { mapListRow } from './users.rows';
import type { LinkKind } from '@ab/shared';
import type { NewProfile, NewTeacher, ProfilePatch, RefRow, StaffProfile, UserRow, UserStore } from './users.store';

const PROFILE = 'id, full_name, role, role_id, disabled_at, disabled_reason, phone_e164, locale, tz, created_at';
const STAFF_ROLES = ['admin', 'teacher', 'assistant', 'sales'] as const;

/** UserStore on the service-role client (migrations 20261006000281-285). */
@Injectable()
export class UsersQueries implements UserStore {
  constructor(@Inject(DB) private readonly db: Db) {}

  async list(query: UsersListQuery): Promise<{ rows: UserRow[]; total: number }> {
    const { data, error } = await this.db.rpc('admin_list_users', {
      ...(query.q && { q: query.q }),
      ...(query.role && { role: query.role }),
      ...(query.status && { status: query.status }),
      lim: query.pageSize,
      off: (query.page - 1) * query.pageSize,
    });
    if (error) throw dbError(error);
    return { rows: data.map(mapListRow), total: data[0]?.total ?? 0 };
  }

  async get(id: string): Promise<UserRow | null> {
    const { data: p, error } = await this.db.from('profiles').select(PROFILE).eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    if (!p) return null;
    const [auth, linked, roleKey] = await Promise.all([this.db.auth.admin.getUserById(id), links.linkedOf(this.db, id), this.roleKey(p.role, p.role_id)]);
    return {
      id: p.id,
      email: auth.data.user?.email ?? null,
      full_name: p.full_name,
      phone_e164: p.phone_e164,
      role: p.role,
      role_id: p.role_id,
      role_key: roleKey,
      disabled_at: p.disabled_at,
      last_sign_in_at: auth.data.user?.last_sign_in_at ?? null,
      created_at: p.created_at,
      linked,
      locale: p.locale,
      tz: p.tz,
      disabled_reason: p.disabled_reason,
    };
  }

  async staff(): Promise<StaffProfile[]> {
    const { data, error } = await this.db.from('profiles').select('id, full_name, role, role_id, disabled_at').in('role', [...STAFF_ROLES]);
    if (error) throw dbError(error);
    return data;
  }

  async profile(id: string): Promise<StaffProfile | null> {
    const { data, error } = await this.db.from('profiles').select('id, full_name, role, role_id, disabled_at').eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  async upsertProfile(row: NewProfile): Promise<void> {
    const { error } = await this.db.from('profiles').upsert(row, { onConflict: 'id' });
    if (error) throw phoneAware(error);
  }

  async updateProfile(id: string, patch: ProfilePatch): Promise<void> {
    const { error } = await this.db.from('profiles').update(patch).eq('id', id);
    if (error) throw phoneAware(error);
  }

  async setDisabled(id: string, value: { by: string; reason: string | null } | null): Promise<void> {
    const patch = value
      ? { disabled_at: new Date().toISOString(), disabled_by: value.by, disabled_reason: value.reason }
      : { disabled_at: null, disabled_by: null, disabled_reason: null };
    const { error } = await this.db.from('profiles').update(patch).eq('id', id);
    if (error) throw dbError(error);
  }

  linkTarget(kind: LinkKind, id: string) {
    return links.linkTarget(this.db, kind, id);
  }

  link(kind: LinkKind, id: string, profileId: string) {
    return links.link(this.db, { kind, id, profileId });
  }

  unlink(profileId: string) {
    return links.unlink(this.db, profileId);
  }

  async createTeacher(row: NewTeacher): Promise<string> {
    const { data, error } = await this.db.from('teachers').insert({ ...row, status: 'active' }).select('id').single();
    if (error) throw phoneAware(error);
    return data.id;
  }

  syncTeacher(profileId: string, patch: { display_name_ar?: string; phone_e164?: string | null }) {
    return links.syncTeacher(this.db, { profileId, patch });
  }

  candidates(kind: LinkKind, q: string | undefined) {
    return links.candidates(this.db, kind, q);
  }

  async references(id: string): Promise<RefRow[]> {
    const { data, error } = await this.db.rpc('user_references', { user_id: id });
    if (error) throw dbError(error);
    return data.map((r) => ({ ref_table: r.ref_table, ref_column: r.ref_column, kind: r.kind === 'link' ? 'link' : 'history', n: Number(r.n) }));
  }

  private async roleKey(role: UserRow['role'], roleId: string | null): Promise<string | null> {
    const query = this.db.from('roles').select('key');
    const { data, error } = await (roleId ? query.eq('id', roleId) : query.eq('is_system', true).eq('base_role', role)).maybeSingle();
    if (error) throw dbError(error);
    return data?.key ?? null;
  }
}

import { conflict } from '../scheduling/errors';

/** A unique violation on a phone is the admin's mistake (409 phone_taken), not a server error. */
function phoneAware(error: Parameters<typeof dbError>[0]): Error {
  return error.code === '23505' ? conflict('phone_taken') : dbError(error);
}
