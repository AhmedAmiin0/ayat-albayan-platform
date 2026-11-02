import { isPermission } from '@ab/shared';
import { beforeAll, describe, expect, it } from 'vitest';
import { walkRoutes, type RouteAccess } from './route-walk.test-util';

// Every non-public endpoint maps to exactly one catalog permission (dynamic roles, 2026-10-05).
// A new controller handler without @Permissions (or a typo'd key) fails here, before review.

/** Signed-in only, on purpose: the client reads its permissions from /auth/me. */
const SESSION = ['AuthController.me', 'AuthSessionController.login', 'AuthSessionController.logout'];
/** «حسابي» (R-ACC-01..05): every login edits its own account, whatever its role. */
const ACCOUNT = ['avatarUploadUrl', 'changeEmail', 'changePassword', 'profile', 'removeAvatar', 'setAvatar', 'updateProfile'].map((h) => `AccountController.${h}`);
/** docs/33: may this login track its own online status (every login, whatever its role). */
const PRESENCE = ['PresenceController.me'];
const SIGNED_IN_ONLY = [...SESSION, ...ACCOUNT, ...PRESENCE];

describe('permission coverage', () => {
  let routes: RouteAccess[];
  beforeAll(async () => {
    routes = await walkRoutes();
  }, 60_000);

  it('finds the whole API', () => {
    expect(routes.length).toBeGreaterThan(190);
  });

  it('gives every non-public, non-signed-in handler one catalog permission', () => {
    const missing = routes.filter((r) => !r.isPublic && !r.signedIn && !isPermission(r.permission));
    expect(missing.map((r) => `${r.key} → ${String(r.permission)}`)).toEqual([]);
  });

  it('keeps @SignedIn to the session and own-account routes', () => {
    const signedIn = routes.filter((r) => r.signedIn && !r.isPublic).map((r) => r.key);
    expect(signedIn.sort()).toEqual([...SIGNED_IN_ONLY].sort());
  });

  it('guards role management with roles.manage', () => {
    const roleRoutes = routes.filter((r) => /^(Roles|StaffUsers)Controller\./.test(r.key));
    expect(roleRoutes.length).toBeGreaterThanOrEqual(7);
    expect(roleRoutes.filter((r) => r.permission !== 'roles.manage').map((r) => r.key)).toEqual([]);
  });
});
