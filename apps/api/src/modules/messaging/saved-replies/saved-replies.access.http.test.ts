import { systemPermissionsOf } from '@ab/shared';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { PermissionResolver } from '../../../common/auth/permissions';
import { replyId, repliesApp, row } from './saved-replies.fakes';

type App = Awaited<ReturnType<typeof repliesApp>>;
const SHARED = replyId(1);
const HERS = replyId(2);
const seed = () => [row({ n: 1 }), row({ n: 2, owner_profile_id: 's2' }), row({ n: 3 })];

describe('an assistant without saved_replies.manage', () => {
  let t: App;
  beforeEach(async () => {
    t = await repliesApp({ rows: seed() });
  });
  afterAll(() => t.app.close());

  it('cannot add, edit, reorder or delete a shared reply (403), and nothing changes', async () => {
    const calls = [
      t.call({ method: 'POST', url: '/saved-replies', token: 'sales', body: { scope: 'shared', title: 'ع', body: 'ب' } }),
      t.call({ method: 'PATCH', url: `/saved-replies/${SHARED}`, token: 'sales', body: { title: 'ج' } }),
      t.call({ method: 'POST', url: `/saved-replies/${SHARED}/move`, token: 'sales', body: { direction: 'down' } }),
      t.call({ method: 'DELETE', url: `/saved-replies/${SHARED}`, token: 'sales' }),
    ];
    const res = await Promise.all(calls);
    expect(res.map((r) => [r.statusCode, r.json<{ code: string }>().code])).toEqual(res.map(() => [403, 'saved_replies_forbidden']));
    expect([t.replies.insert, t.replies.update, t.replies.remove, t.replies.setPositions].map((f) => f.mock.calls.length)).toEqual([0, 0, 0, 0]);
  });

  it('cannot see, edit, delete or stage another assistant\'s personal reply (404)', async () => {
    const edit = await t.call({ method: 'PATCH', url: `/saved-replies/${HERS}`, token: 'sales', body: { title: 'ج' } });
    const stage = await t.call({ method: 'POST', url: `/saved-replies/${HERS}/stage`, token: 'sales', body: { clientRequestId: replyId(9) } });
    expect([edit.statusCode, stage.statusCode]).toEqual([404, 404]);
    expect((await t.call({ method: 'DELETE', url: `/saved-replies/${HERS}`, token: 'sales' })).statusCode).toBe(204);
    expect(t.replies.table.some((r) => r.id === HERS)).toBe(true);
    const list = await t.call({ method: 'GET', url: '/saved-replies', token: 'sales' });
    expect(list.json<{ id: string }[]>().map((r) => r.id)).not.toContain(HERS);
  });

  it('even the admin cannot reach an assistant\'s personal reply', async () => {
    const res = await t.call({ method: 'PATCH', url: `/saved-replies/${HERS}`, body: { title: 'ج' } });
    expect(res.statusCode).toBe(404);
  });

  it('a teacher granted the permission still gets 403 on every route', async () => {
    const res = await t.call({ method: 'POST', url: '/saved-replies', token: 'teacher', body: { scope: 'mine', title: 'ع', body: 'ب' } });
    expect(res.statusCode).toBe(403);
  });
});

describe('an assistant granted saved_replies.manage (a DB-edited role)', () => {
  const resolve: PermissionResolver = async (user) => {
    const all = user.role ? systemPermissionsOf(user.role) : [];
    return user.role === 'sales' || user.role === 'teacher' ? [...all, 'saved_replies.manage'] : all;
  };
  let t: App;
  beforeEach(async () => {
    t = await repliesApp({ rows: seed(), resolve });
  });
  afterAll(() => t.app.close());

  it('edits and reorders the shared list', async () => {
    const edit = await t.call({ method: 'PATCH', url: `/saved-replies/${SHARED}`, token: 'sales', body: { title: 'جديد' } });
    expect([edit.statusCode, edit.json<{ title: string }>().title]).toEqual([200, 'جديد']);
    const move = await t.call({ method: 'POST', url: `/saved-replies/${SHARED}/move`, token: 'sales', body: { direction: 'down' } });
    expect(move.json<{ id: string; scope: string }[]>().filter((r) => r.scope === 'shared').map((r) => r.id)).toEqual([replyId(3), SHARED]);
  });
});
