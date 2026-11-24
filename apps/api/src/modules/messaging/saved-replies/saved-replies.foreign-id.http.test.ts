import { afterEach, describe, expect, it } from 'vitest';
import { systemResolver, type PermissionResolver } from '@/common/auth/permissions';
import { replyId, repliesApp, row } from './saved-replies.fakes';

type App = Awaited<ReturnType<typeof repliesApp>>;
const HERS = replyId(2);
const seed = () => [
  row({ n: 1, owner_profile_id: 's2' }),
  row({ n: 2, owner_profile_id: 's2' }),
  row({ n: 3, owner_profile_id: 's1' }),
];
const withManage: PermissionResolver = async (user) => [
  ...(await systemResolver(user)),
  'saved_replies.manage',
];

let t: App | null = null;
afterEach(async () => {
  await t?.app.close();
  t = null;
});

const move = (app: App, token: string) =>
  app.call({
    method: 'POST', url: `/saved-replies/${HERS}/move`, token, body: { direction: 'up' },
  });

const positions = (app: App) => app.replies.table.map((r) => [r.id, r.position]);

describe('POST /saved-replies/:id/move: another person\'s personal reply', () => {
  it('another assistant\'s personal reply is 404 to sales, and no list is reordered', async () => {
    t = await repliesApp({ rows: seed() });
    const before = positions(t);
    const res = await move(t, 'sales');
    const body = res.json<{ code: string }>();
    expect([res.statusCode, body.code]).toEqual([404, 'saved_reply_not_found']);
    const writes = [t.replies.listOf, t.replies.setPositions].map((f) => f.mock.calls.length);
    expect(writes).toEqual([0, 0]);
    expect(positions(t)).toEqual(before);
  });

  it('it stays 404 for an assistant who may manage the shared list', async () => {
    t = await repliesApp({ rows: seed(), resolve: withManage });
    const res = await move(t, 'sales');
    expect(res.statusCode).toBe(404);
    expect(t.replies.setPositions).not.toHaveBeenCalled();
  });

  it('a teacher is 403 before any reply is read', async () => {
    t = await repliesApp({ rows: seed(), resolve: withManage });
    const res = await move(t, 'teacher');
    const body = res.json<{ code: string }>();
    expect([res.statusCode, body.code]).toEqual([403, 'saved_replies_forbidden']);
    expect(t.replies.one).not.toHaveBeenCalled();
  });

  it('its owner still moves it (200)', async () => {
    t = await repliesApp({ rows: seed() });
    const res = await move(t, 'salesB');
    expect(res.statusCode).toBe(200);
    expect(t.replies.setPositions).toHaveBeenCalledTimes(1);
  });
});
