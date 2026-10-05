import { PermissionResolver, type ResolvedAccess } from '../common/auth/permission-resolver';

// Vitest setup file. The HTTP tests boot AppModule with a fake token verifier and no database; the
// guard would otherwise look the caller's permissions up in Postgres. They test controllers, so
// every caller gets the wildcard here. Permission enforcement itself is tested with the real
// guard and resolver (auth.guard.permissions.test.ts, permission-resolver.test.ts, which put
// `realResolve` back). A plain assignment, not vi.spyOn: `vi.resetAllMocks()` must not undo it.
export const realResolve = PermissionResolver.prototype.resolve;

const wildcard: ResolvedAccess = {
  roleKey: 'admin',
  permissions: new Set(['*']),
  fullName: null,
  locale: null,
  tz: null,
};

PermissionResolver.prototype.resolve = async () => wildcard;
