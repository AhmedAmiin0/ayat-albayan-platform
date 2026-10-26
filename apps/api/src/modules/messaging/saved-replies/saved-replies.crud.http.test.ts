import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { replyId, repliesApp, row } from './saved-replies.fakes';

type App = Awaited<ReturnType<typeof repliesApp>>;

describe('/saved-replies CRUD', () => {
  let t: App;
  beforeEach(async () => {
    t = await repliesApp({ rows: [row({ n: 1, position: 0 }), row({ n: 2, position: 1 }), row({ n: 3, owner_profile_id: 's1', position: 0 })] });
  });
  afterAll(() => t.app.close());

  it('an assistant adds a personal reply at the end of her own list (201, trimmed)', async () => {
    const res = await t.call({ method: 'POST', url: '/saved-replies', token: 'sales', body: { scope: 'mine', title: ' متابعة ', body: ' أهلًا {name} ' } });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ scope: 'mine', title: 'متابعة', body: 'أهلًا {name}', attachment: null, position: 1 });
    expect(t.replies.insert).toHaveBeenCalledWith(expect.objectContaining({ owner_profile_id: 's1', created_by: 's1', updated_by: 's1' }));
  });

  it('the admin adds a shared reply after the last one', async () => {
    const res = await t.call({ method: 'POST', url: '/saved-replies', body: { scope: 'shared', title: 'الأسعار', body: 'تجد الأسعار مرفقة' } });
    expect([res.statusCode, res.json<{ scope: string }>().scope, res.json<{ position: number }>().position]).toEqual([201, 'shared', 2]);
  });

  it('refuses a blank title, a 61-character title and an unknown scope (400)', async () => {
    for (const body of [{ scope: 'mine', title: ' ', body: 'ب' }, { scope: 'mine', title: 'ع'.repeat(61), body: 'ب' }, { scope: 'all', title: 'ع', body: 'ب' }]) {
      expect((await t.call({ method: 'POST', url: '/saved-replies', token: 'sales', body })).statusCode).toBe(400);
    }
    expect(t.replies.insert).not.toHaveBeenCalled();
  });

  it('edits her own reply; an unknown or malformed id is 404', async () => {
    const res = await t.call({ method: 'PATCH', url: `/saved-replies/${replyId(3)}`, token: 'sales', body: { body: 'نص جديد' } });
    expect([res.statusCode, res.json<{ body: string }>().body]).toEqual([200, 'نص جديد']);
    expect((await t.call({ method: 'PATCH', url: `/saved-replies/${replyId(77)}`, token: 'sales', body: { title: 'ج' } })).statusCode).toBe(404);
    expect((await t.call({ method: 'PATCH', url: '/saved-replies/nope', token: 'sales', body: { title: 'ج' } })).statusCode).toBe(404);
  });

  it('moves a reply up and down within its list; the ends do not move', async () => {
    const down = await t.call({ method: 'POST', url: `/saved-replies/${replyId(1)}/move`, body: { direction: 'down' } });
    expect(down.json<{ id: string; scope: string }[]>().filter((r) => r.scope === 'shared').map((r) => r.id)).toEqual([replyId(2), replyId(1)]);
    await t.call({ method: 'POST', url: `/saved-replies/${replyId(1)}/move`, body: { direction: 'down' } });
    expect(t.replies.setPositions).toHaveBeenLastCalledWith([], 'a1');
    const bad = await t.call({ method: 'POST', url: `/saved-replies/${replyId(1)}/move`, body: { direction: 'left' } });
    expect(bad.statusCode).toBe(400);
  });

  it('deletes (204), and deleting again is 204 too', async () => {
    for (let i = 0; i < 2; i++) {
      expect((await t.call({ method: 'DELETE', url: `/saved-replies/${replyId(3)}`, token: 'sales' })).statusCode).toBe(204);
    }
    expect(t.replies.table.map((r) => r.id)).toEqual([replyId(1), replyId(2)]);
  });
});
