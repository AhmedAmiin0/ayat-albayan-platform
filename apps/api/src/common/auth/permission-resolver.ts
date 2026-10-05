import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../db/db.module';

export interface ResolvedAccess {
  roleKey: string | null;
  permissions: ReadonlySet<string>;
  fullName: string | null;
  locale: string | null;
  tz: string | null;
}

interface Entry {
  at: number;
  value: ResolvedAccess;
}

export const PERMISSION_TTL_MS = 30_000;

/**
 * The caller's permission set, resolved server-side on every request (never from the JWT, so a
 * role change applies immediately). In-memory TTL cache per user id; role mutations call
 * `invalidate()`. Another API instance catches up within the TTL.
 */
@Injectable()
export class PermissionResolver {
  private readonly cache = new Map<string, Entry>();

  /** Replaced by tests. */
  now: () => number = Date.now;

  constructor(@Inject(DB) private readonly db: Db) {}

  async resolve(userId: string): Promise<ResolvedAccess> {
    const hit = this.cache.get(userId);
    if (hit && this.now() - hit.at < PERMISSION_TTL_MS) return hit.value;
    const value = await this.load(userId);
    this.cache.set(userId, { at: this.now(), value });
    return value;
  }

  /** One user, or everyone when no id is given (a role's permissions changed: any holder is stale). */
  invalidate(userId?: string): void {
    if (userId) this.cache.delete(userId);
    else this.cache.clear();
  }

  private async load(userId: string): Promise<ResolvedAccess> {
    const { data: profile, error } = await this.db
      .from('profiles')
      .select('role, role_id, full_name, locale, tz')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw new Error(`profile lookup failed: ${error.message}`);
    if (!profile) return { roleKey: null, permissions: new Set(), fullName: null, locale: null, tz: null };
    const role = profile.role_id
      ? await this.db.from('roles').select('id, key').eq('id', profile.role_id).maybeSingle()
      : await this.db.from('roles').select('id, key').eq('key', profile.role).eq('is_system', true).maybeSingle();
    if (role.error) throw new Error(`role lookup failed: ${role.error.message}`);
    const perms = role.data
      ? await this.db.from('role_permissions').select('permission').eq('role_id', role.data.id)
      : { data: [], error: null };
    if (perms.error) throw new Error(`permission lookup failed: ${perms.error.message}`);
    return {
      roleKey: role.data?.key ?? null,
      permissions: new Set((perms.data ?? []).map((p) => p.permission)),
      fullName: profile.full_name,
      locale: profile.locale,
      tz: profile.tz,
    };
  }
}
