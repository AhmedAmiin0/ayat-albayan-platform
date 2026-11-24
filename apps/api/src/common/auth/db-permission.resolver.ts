import { effectivePermissions, type Permission } from '@ab/catalog';
import type { Db } from '@/common/db/db.module';
import type { PermissionCache } from './permission.cache';
import type { TestFlagReader } from './test-flag/test-flag.reader';
import { AccountDisabledError, type PermissionResolver } from './permissions';
import type { AuthUser } from './verify-token';

const ROLE_COLUMNS = 'id, key, is_system, role_permissions(permission)';

interface RoleRow {
  key: string;
  is_system: boolean;
  role_permissions: { permission: string }[];
}

/**
 * The app's PermissionResolver: profiles.role (the base scope) + the held role (profiles.role_id,
 * or the system role of profiles.role when null) → its role_permissions → effectivePermissions.
 * Read from the DB, never from the token, so a changed role applies within the cache TTL.
 * A user without a profile has no permissions (as with no role before). A disabled profile throws
 * AccountDisabledError (never cached), so a still-valid JWT is refused within the cache TTL.
 * `isTest`: profiles.is_test through TestFlagReader (its own short cache, false on any doubt).
 */
export function dbPermissionResolver(input: ResolverDeps): PermissionResolver {
  const { db, cache, flags } = input;
  const load = async (userId: string): Promise<readonly Permission[]> => {
    const profile = await db.from('profiles').select('role, role_id, disabled_at').eq('id', userId).maybeSingle();
    if (profile.error) throw new Error(`permissions: ${profile.error.message}`);
    if (!profile.data) return [];
    if (profile.data.disabled_at) throw new AccountDisabledError();
    const { role, role_id } = profile.data;
    const query = db.from('roles').select(ROLE_COLUMNS);
    const held = await (role_id ? query.eq('id', role_id) : query.eq('is_system', true).eq('base_role', role)).maybeSingle();
    if (held.error) throw new Error(`permissions: ${held.error.message}`);
    const row: RoleRow | null = held.data;
    if (!row) return [];
    return effectivePermissions({
      baseRole: role,
      granted: row.role_permissions.map((p) => p.permission),
      allGrantable: row.is_system && row.key === 'admin',
    });
  };
  const resolve = (user: AuthUser) =>
    user.role ? cache.get(user.id, () => load(user.id)) : Promise.resolve([]);
  return Object.assign(resolve, { isTest: (user: AuthUser) => flags.ofUser(user.id) });
}

interface ResolverDeps {
  db: Db;
  cache: PermissionCache;
  flags: TestFlagReader;
}
