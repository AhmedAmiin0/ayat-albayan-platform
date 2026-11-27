import { describe, expect, it } from 'vitest';
import { chatListRoutes as routes } from '../chat-lists.routes';

const LIST = {
  id: 'e1111111-1111-4111-8111-111111111111',
  name: 'عملاء',
  count: 2,
  auto_rule: null,
};

describe('chatListRoutes (docs/22 §3)', () => {
  it('keeps the paths the api serves today', () => {
    const lines = Object.values(routes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual([
      'GET /chat-lists',
      'POST /chat-lists',
      'PATCH /chat-lists/:id',
      'DELETE /chat-lists/:id',
      'PUT /chat-lists/:id/threads/:phone',
      'DELETE /chat-lists/:id/threads/:phone',
    ]);
  });

  it('answers every list with its count and its automatic rule', () => {
    const auto = { ...LIST, auto_rule: 'subscribed' };
    expect(routes.all.response.parse([LIST, auto])).toEqual([LIST, auto]);
    expect(routes.all.response.safeParse([{ ...LIST, auto_rule: 'paid' }]).success).toBe(false);
    expect(routes.all.response.safeParse([{ ...LIST, count: '2' }]).success).toBe(false);
  });

  it('creates and renames with a trimmed name and answers the list', () => {
    expect(routes.create.body.parse({ name: ' جدد ' })).toEqual({ name: 'جدد' });
    expect(routes.rename.body.safeParse({ name: '' }).success).toBe(false);
    expect(routes.rename.response.parse(LIST)).toEqual(LIST);
  });

  it('names a list by a uuid and a member by its E.164 number', () => {
    expect(routes.remove.params.safeParse({ id: 'x' }).success).toBe(false);
    const member = routes.addThread.params.parse({ id: LIST.id, phone: '+966501234567' });
    expect(member).toEqual({ id: LIST.id, phone: '+966501234567' });
    expect(routes.dropThread.params.safeParse({ id: LIST.id, phone: 'abc' }).success).toBe(false);
  });

  it('answers nothing for the deletes and the membership writes', () => {
    const empty = [routes.remove, routes.addThread, routes.dropThread].map((r) => r.response);
    expect(empty).toEqual(['empty', 'empty', 'empty']);
  });
});
