import { beforeAll, describe, expect, it } from 'vitest';
import { accessProblems } from './access-problems.test-util';
import { walkRoutes, type RouteAccess } from './route-walk.test-util';

// Every non-public endpoint has catalog permissions from one source: its handler, its class or its
// route object (dynamic roles). A missing or misspelt key fails here, before review.

/** Signed-in only, on purpose: the client reads its permissions from /auth/me. */
const SESSION = [
  'AuthController.me',
  'AuthSessionController.login',
  'AuthSessionController.logout',
];
/** R-ACC-01..05: every login edits its own account, whatever its role. */
const ACCOUNT = [
  'avatarUploadUrl',
  'changeEmail',
  'changePassword',
  'profile',
  'removeAvatar',
  'setAvatar',
  'setLocale',
  'setup',
  'updateProfile',
].map((h) => `AccountController.${h}`);
/** docs/33: may this login track its own online status (every login, whatever its role). */
const PRESENCE = ['PresenceController.me'];
/** The report's live page: any role may ask; ReportReaders answers its readers only (404 else). */
const REPORT_PAGE = ['ReportPageController.byPublicId', 'ReportPageController.byReportId'];
/** A managed short link's gate (docs/19): any signed-in user; the decision table answers. */
const SHORT_LINK_GATE = ['GateSignedInController.open'];
const SIGNED_IN_ONLY = [...SESSION, ...ACCOUNT, ...PRESENCE, ...REPORT_PAGE, ...SHORT_LINK_GATE];

describe('permission coverage', () => {
  let routes: RouteAccess[];
  beforeAll(async () => {
    routes = await walkRoutes();
  }, 60_000);

  it('finds the whole API', () => {
    expect(routes.length).toBeGreaterThan(190);
  });

  it('gives every handler catalog permissions from one source and a Swagger tag', () => {
    expect(routes.flatMap(accessProblems)).toEqual([]);
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
