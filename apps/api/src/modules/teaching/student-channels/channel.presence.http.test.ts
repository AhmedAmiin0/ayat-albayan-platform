import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { channelApp, OTHER, ST, type Who } from './channel.fakes';

type App = Awaited<ReturnType<typeof channelApp>>;
const TEACHER = `/teachers/me/channels/${ST}/presence`;
const PORTAL = `/portal/students/${ST}/channel/presence`;
const ADMIN = `/students/${ST}/channel/presence`;
const SALES = `/sales/students/${ST}/channel/presence`;

const ids = (body: { peers: { profile_id: string }[] }): string[] =>
  body.peers.map((p) => p.profile_id);

// docs/33 §2: the chat's own access check first, then only the people this caller may see.
describe('student channel presence over HTTP', () => {
  let t: App;
  beforeAll(async () => {
    t = await channelApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.clearAllMocks();
    t.presence.settings.enabled.mockResolvedValue(true);
  });

  it('a family sees its teacher only (never itself, never the other family login)', async () => {
    for (const who of ['guardian', 'student'] as Who[]) {
      const res = await t.call('GET', PORTAL, who);
      expect([who, res.statusCode, ids(res.json())]).toEqual([who, 200, ['p-t1']]);
    }
    expect((await t.call('GET', PORTAL, 'guardian')).json().peers[0]).toEqual({
      profile_id: 'p-t1',
      role: 'teacher',
      last_seen_at: '2026-10-30T09:00:00.000Z',
    });
  });

  it('the teacher and the owning assistant see the family app users, not the teacher', async () => {
    expect(ids((await t.call('GET', TEACHER, 'teacher')).json())).toEqual(['p-g', 'p-s']);
    expect(ids((await t.call('GET', SALES, 'sales')).json())).toEqual(['p-g', 'p-s']);
  });

  it('the admin sees everyone in the chat', async () => {
    expect(ids((await t.call('GET', ADMIN, 'admin')).json())).toEqual(['p-t1', 'p-g', 'p-s']);
  });

  it('refuses whoever cannot open the chat: 404 as the messages route, 403 on another role', async () => {
    expect((await t.call('GET', TEACHER, 'oldTeacher')).statusCode).toBe(404);
    expect((await t.call('GET', PORTAL, 'otherGuardian')).statusCode).toBe(404);
    expect(
      (await t.call('GET', `/portal/students/${OTHER}/channel/presence`, 'guardian')).statusCode,
    ).toBe(404);
    expect((await t.call('GET', SALES, 'otherSales')).statusCode).toBe(404);
    expect((await t.call('GET', PORTAL, 'child')).statusCode).toBe(403);
    expect((await t.call('GET', TEACHER, 'guardian')).statusCode).toBe(403);
    expect((await t.call('GET', ADMIN, 'sales')).statusCode).toBe(403);
    expect((await t.call('GET', ADMIN, 'assistant')).statusCode).toBe(403);
    expect((await t.call('GET', SALES, 'admin')).statusCode).toBe(403);
    expect(t.presence.repo.lastSeen).not.toHaveBeenCalled();
  });

  it('a participant of a closed channel sees nobody; the monitor still does', async () => {
    t.queries.isOpen.mockResolvedValue(false);
    expect((await t.call('GET', PORTAL, 'guardian')).json()).toEqual({ enabled: true, peers: [] });
    expect((await t.call('GET', TEACHER, 'teacher')).json()).toEqual({ enabled: true, peers: [] });
    expect(ids((await t.call('GET', ADMIN, 'admin')).json())).toHaveLength(3);
    t.queries.isOpen.mockResolvedValue(true);
  });

  it('presence_enabled off: nothing shown, nothing read', async () => {
    t.presence.settings.enabled.mockResolvedValue(false);
    expect((await t.call('GET', PORTAL, 'guardian')).json()).toEqual({ enabled: false, peers: [] });
    expect(t.presence.repo.channelPeople).not.toHaveBeenCalled();
  });
});
