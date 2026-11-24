import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { linksApp } from '@/modules/platform/short-links-admin/short-links-admin.app.fakes';
import { managedRow } from '@/modules/platform/short-links-admin/short-links-admin.fakes';

type App = Awaited<ReturnType<typeof linksApp>>;
const CODE = 'Mg12Cd34Ef';
const FUTURE = new Date(Date.now() + 86_400_000).toISOString();
const ROLES = ['teacher', 'guardian', 'student', 'sales'] as const;
const LISTED_OTHER = {
  id: 'u1',
  code: CODE,
  profile_id: '00000000-0000-4000-8000-0000000000f9',
  phone_e164: '+201000000099',
};

// docs/19 «Gate»: a signed-in open is a capability link for anyone signed in, so the boundary is
// the code itself (managed kind only) and, for audience «listed», the link's own user list.
describe('POST /public/short-links/:code/open outside the caller’s reach', () => {
  let t: App;
  beforeAll(async () => {
    t = await linksApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => vi.clearAllMocks());

  const open = (token: (typeof ROLES)[number]) =>
    t.call({ method: 'POST', url: `/public/short-links/${CODE}/open`, token });

  it.each(ROLES)('%s: an unknown or system code is 404, no visit recorded', async (role) => {
    for (const row of [null, managedRow({ kind: 'teacher_report', expires_at: FUTURE })]) {
      t.system.row.mockResolvedValue(row);
      const res = await open(role);
      expect([res.statusCode, res.json<{ code: string }>().code]).toEqual([
        404,
        'short_link_not_found',
      ]);
    }
    expect(t.users.recordVisit).not.toHaveBeenCalled();
  });

  it.each(ROLES)('%s: a link listed for other people is not_allowed, no target', async (role) => {
    t.system.row.mockResolvedValue(managedRow({ audience: 'listed', expires_at: FUTURE }));
    t.users.users.mockResolvedValue([LISTED_OTHER]);
    const res = await open(role);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ outcome: 'not_allowed' });
    expect(t.users.recordVisit).not.toHaveBeenCalled();
  });
});
