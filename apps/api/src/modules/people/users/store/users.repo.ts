import { isFamilyEmail, type UsersListQuery } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';
import * as links from './users.links.repo';
import { mapListRow } from './users.rows';
import type { RefRow, UserRow } from './users.store';

const PROFILE =
  'id, full_name, role, role_id, disabled_at, disabled_reason, phone_e164, locale, tz, created_at, username';

/** A family login's synthetic email (docs/30 §2) is never shown. */
const visibleEmail = (email: string | undefined): string | null =>
  email && !isFamilyEmail(email) ? email : null;

/** The admin_list_users arguments of one page (unset filters are left out). */
const listArgs = (q: UsersListQuery, lim: number, off: number) => ({
  ...(q.q && { q: q.q }),
  ...(q.role && { role: q.role }),
  ...(q.status && { status: q.status }),
  lim,
  off,
});

/**
 * The directory half of UserStore on the service-role client (migrations 20261006000281-288): the
 * page, one login with its auth data, and what references it. The profile writes live in
 * user-profiles.repo.ts, the linked records in user-links.repo.ts; users.store.provider.ts joins
 * them.
 */
@Injectable()
export class UsersRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async list(query: UsersListQuery): Promise<{ rows: UserRow[]; total: number }> {
    const { data, error } = await this.db.rpc(
      'admin_list_users',
      listArgs(query, query.pageSize, (query.page - 1) * query.pageSize),
    );
    if (error) throw dbError(error);
    return { rows: data.map(mapListRow), total: data[0]?.total ?? (await this.totalBeyond(query)) };
  }

  /** A page past the last has no row to carry the total: the first row of page 1 does. */
  private async totalBeyond(query: UsersListQuery): Promise<number> {
    if (query.page <= 1) return 0;
    const { data, error } = await this.db.rpc('admin_list_users', listArgs(query, 1, 0));
    if (error) throw dbError(error);
    return data[0]?.total ?? 0;
  }

  async get(id: string): Promise<UserRow | null> {
    const { data: p, error } = await this.db
      .from('profiles')
      .select(PROFILE)
      .eq('id', id)
      .maybeSingle();
    if (error) throw dbError(error);
    if (!p) return null;
    const [auth, linked, roleKey] = await Promise.all([
      this.db.auth.admin.getUserById(id),
      links.linkedOf(this.db, id),
      this.roleKey(p.role, p.role_id),
    ]);
    return {
      id: p.id,
      email: visibleEmail(auth.data.user?.email),
      username: p.username,
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

  async references(id: string): Promise<RefRow[]> {
    const { data, error } = await this.db.rpc('user_references', { user_id: id });
    if (error) throw dbError(error);
    return data.map((r) => ({
      ref_table: r.ref_table,
      ref_column: r.ref_column,
      kind: r.kind === 'link' ? 'link' : 'history',
      n: Number(r.n),
    }));
  }

  private async roleKey(role: UserRow['role'], roleId: string | null): Promise<string | null> {
    const query = this.db.from('roles').select('key');
    const { data, error } = await (
      roleId ? query.eq('id', roleId) : query.eq('is_system', true).eq('base_role', role)
    ).maybeSingle();
    if (error) throw dbError(error);
    return data?.key ?? null;
  }
}
