import { systemPermissionsOf } from '@ab/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PermissionResolver } from '../../common/auth/permissions';
import { inboxApp } from '../inbox/test-app';

type App = Awaited<ReturnType<typeof inboxApp>>;
const ID = '0c000000-0000-4000-8000-000000000001';
const LIST = { id: ID, name: 'بانتظار الدفع', count: 2, auto_rule: null };
const PHONE = encodeURIComponent('+966501234567');

describe('/chat-lists (docs/22 §3): the academy\'s shared lists, admin and sales', () => {
  let t: App;
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.lists.all.mockResolvedValue([LIST]);
    t.lists.one.mockResolvedValue(LIST);
    t.lists.count.mockResolvedValue(1);
    t.lists.create.mockResolvedValue({ ...LIST, count: 0 });
    t.lists.rename.mockResolvedValue('renamed');
  });

  it('GET lists every list with its count, for the admin and an assistant', async () => {
    for (const token of ['admin', 'sales']) {
      const res = await t.call({ method: 'GET', url: '/chat-lists', token });
      expect([res.statusCode, res.json()]).toEqual([200, [LIST]]);
    }
  });

  it('POST creates (201, trimmed name, creator recorded); 409 list_name_taken and list_limit', async () => {
    const res = await t.call({ method: 'POST', url: '/chat-lists', token: 'sales', body: { name: '  بانتظار الدفع ' } });
    expect([res.statusCode, res.json()]).toEqual([201, { ...LIST, count: 0 }]);
    expect(t.lists.create).toHaveBeenCalledWith({ name: 'بانتظار الدفع', name_key: 'بانتظار الدفع', created_by: 's1' });
    t.lists.create.mockResolvedValueOnce('taken');
    const taken = await t.call({ method: 'POST', url: '/chat-lists', body: { name: 'بإنتظار الدفع' } });
    expect([taken.statusCode, taken.json().code]).toEqual([409, 'list_name_taken']);
    t.lists.count.mockResolvedValueOnce(30);
    const full = await t.call({ method: 'POST', url: '/chat-lists', body: { name: 'أخرى' } });
    expect([full.statusCode, full.json().code]).toEqual([409, 'list_limit']);
  });

  it('POST refuses a blank or 31-character name (400)', async () => {
    for (const name of ['   ', 'ب'.repeat(31)]) {
      const res = await t.call({ method: 'POST', url: '/chat-lists', body: { name } });
      expect(res.statusCode).toBe(400);
    }
    expect(t.lists.create).not.toHaveBeenCalled();
  });

  it('PATCH renames; 404 for an unknown or malformed id; 409 for a taken name', async () => {
    const res = await t.call({ method: 'PATCH', url: `/chat-lists/${ID}`, token: 'sales', body: { name: 'مدفوع' } });
    expect([res.statusCode, res.json()]).toEqual([200, LIST]);
    t.lists.rename.mockResolvedValueOnce(null);
    expect((await t.call({ method: 'PATCH', url: `/chat-lists/${ID}`, body: { name: 'مدفوع' } })).statusCode).toBe(404);
    expect((await t.call({ method: 'PATCH', url: '/chat-lists/nope', body: { name: 'مدفوع' } })).statusCode).toBe(404);
    t.lists.rename.mockResolvedValueOnce('taken');
    expect((await t.call({ method: 'PATCH', url: `/chat-lists/${ID}`, body: { name: 'مدفوع' } })).json().code).toBe('list_name_taken');
  });

  it('DELETE answers 204 and deletes the list only', async () => {
    const res = await t.call({ method: 'DELETE', url: `/chat-lists/${ID}`, token: 'sales' });
    expect(res.statusCode).toBe(204);
    expect(t.lists.remove).toHaveBeenCalledWith(ID);
  });

  it('PUT / DELETE a chat: 204 (idempotent), E.164 checked, 404 for an unknown list', async () => {
    for (let i = 0; i < 2; i++) {
      expect((await t.call({ method: 'PUT', url: `/chat-lists/${ID}/threads/${PHONE}`, token: 'sales' })).statusCode).toBe(204);
      expect((await t.call({ method: 'DELETE', url: `/chat-lists/${ID}/threads/${PHONE}`, token: 'sales' })).statusCode).toBe(204);
    }
    expect(t.lists.add).toHaveBeenCalledWith({ listId: ID, phone: '+966501234567', by: 's1' });
    expect(t.lists.drop).toHaveBeenCalledWith(ID, '+966501234567');
    const bad = await t.call({ method: 'PUT', url: `/chat-lists/${ID}/threads/abc` });
    expect([bad.statusCode, bad.json().code]).toEqual([400, 'invalid_phone']);
    t.lists.one.mockResolvedValue(null);
    expect((await t.call({ method: 'PUT', url: `/chat-lists/${ID}/threads/${PHONE}` })).statusCode).toBe(404);
    expect((await t.call({ method: 'DELETE', url: `/chat-lists/${ID}/threads/${PHONE}` })).statusCode).toBe(404);
  });

  it('a teacher (and a guardian) is 403 on every route, nothing read or written', async () => {
    for (const token of ['teacher', 'guardian']) {
      expect((await t.call({ method: 'GET', url: '/chat-lists', token })).statusCode).toBe(403);
      expect((await t.call({ method: 'POST', url: '/chat-lists', token, body: { name: 'س' } })).statusCode).toBe(403);
      expect((await t.call({ method: 'PUT', url: `/chat-lists/${ID}/threads/${PHONE}`, token })).statusCode).toBe(403);
      expect((await t.call({ method: 'DELETE', url: `/chat-lists/${ID}`, token })).statusCode).toBe(403);
    }
    expect([t.lists.all, t.lists.create, t.lists.add, t.lists.remove].map((f) => f.mock.calls.length)).toEqual([0, 0, 0, 0]);
  });
});

describe('/chat-lists without inbox.lists, or with lists but no inbox.read', () => {
  const resolve: PermissionResolver = async (user) => {
    const all = user.role ? systemPermissionsOf(user.role) : [];
    if (user.id === 's1') return all.filter((p) => p !== 'inbox.lists');
    if (user.id === 's2') return all.filter((p) => p !== 'inbox.read');
    return user.role === 'teacher' ? [...all, 'inbox.lists'] : all;
  };
  let t: App;
  beforeAll(async () => {
    t = await inboxApp(resolve);
  });
  afterAll(() => t.app.close());

  it('is 403 for sales without either permission, and for a teacher granted inbox.lists', async () => {
    for (const token of ['sales', 'salesB', 'teacher']) {
      expect((await t.call({ method: 'GET', url: '/chat-lists', token })).statusCode).toBe(403);
      expect((await t.call({ method: 'POST', url: '/chat-lists', token, body: { name: 'س' } })).statusCode).toBe(403);
    }
    expect(t.lists.all).not.toHaveBeenCalled();
  });
});
