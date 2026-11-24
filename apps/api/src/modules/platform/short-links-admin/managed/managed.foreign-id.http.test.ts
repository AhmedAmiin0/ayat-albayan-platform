import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  linksApp,
  OTHER_SALES,
  SALES,
} from '@/modules/platform/short-links-admin/short-links-admin.app.fakes';
import { managedRow } from '@/modules/platform/short-links-admin/short-links-admin.fakes';

type App = Awaited<ReturnType<typeof linksApp>>;
const CODE = 'Mg12Cd34Ef';
const FUTURE = new Date(Date.now() + 86_400_000).toISOString();
const ROUTES = [
  { method: 'GET', url: `/short-links/${CODE}` },
  { method: 'PATCH', url: `/short-links/${CODE}`, payload: { title: 'عنوان آخر' } },
  { method: 'POST', url: `/short-links/${CODE}/revoke` },
  { method: 'POST', url: `/short-links/${CODE}/resend` },
] as const;

describe("/short-links/:code on another salesperson's link (docs/19)", () => {
  let t: App;
  beforeAll(async () => {
    t = await linksApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.clearAllMocks();
    const row = managedRow({ created_by: OTHER_SALES, expires_at: FUTURE });
    t.links.byCode.mockResolvedValue(row);
    t.links.update.mockImplementation(async () => ({ ...row, status: 'revoked' }));
  });

  it.each(ROUTES)('$method $url is the 404 of an unknown code, nothing read or sent', async (r) => {
    const res = await t.call({ ...r, token: 'sales' });
    expect([res.statusCode, res.json<{ code: string }>().code]).toEqual([
      404,
      'short_link_not_found',
    ]);
    const touched = [t.users.users, t.users.visits, t.people.byIds, t.links.update];
    const sent = [t.sync.replace, t.sender.sendAll, t.audit.record];
    expect([...touched, ...sent].filter((fn) => fn.mock.calls.length > 0)).toEqual([]);
  });

  it('her own link still opens', async () => {
    t.links.byCode.mockResolvedValue(managedRow({ created_by: SALES, expires_at: FUTURE }));
    const res = await t.call({ method: 'GET', url: `/short-links/${CODE}`, token: 'sales' });
    expect(res.statusCode).toBe(200);
  });

  it.each(ROUTES)('the admin still reaches $method $url', async (r) => {
    const res = await t.call({ ...r, token: 'admin' });
    expect(res.statusCode).toBeLessThan(300);
  });
});
