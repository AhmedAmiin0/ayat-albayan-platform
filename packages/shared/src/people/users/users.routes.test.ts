import { describe, expect, it } from 'vitest';
import { usersRoutes } from './users.routes';

const ID = '11111111-1111-4111-8111-111111111111';
const ALL = Object.values(usersRoutes);
const view = {
  id: ID,
  email: 'a@b.co',
  full_name: 'سارة',
  phone_e164: null,
  role: 'assistant',
  role_id: null,
  role_key: null,
  status: 'active',
  disabled_at: null,
  last_sign_in_at: null,
  created_at: '2026-11-01T00:00:00.000Z',
  linked: null,
};

describe('usersRoutes (R-ACC: the staff directory of logins)', () => {
  it('keeps the paths the api serves today', () => {
    expect(ALL.map((r) => `${r.method} ${r.path}`)).toEqual([
      'GET /users',
      'GET /users/role-options',
      'GET /users/link-candidates',
      'GET /users/:id',
      'POST /users',
      'PATCH /users/:id',
      'POST /users/:id/disable',
      'POST /users/:id/enable',
      'POST /users/:id/reset-password',
      'POST /users/:id/sign-out',
      'DELETE /users/:id',
    ]);
  });

  it('lets in users.read for the reads and users.write for the rest, under the users tag', () => {
    const reads = [usersRoutes.list, usersRoutes.roleOptions, usersRoutes.read];
    expect(new Set(reads.map((r) => r.permissions.join()))).toEqual(new Set(['users.read']));
    const writes = ALL.filter((r) => !reads.some((read) => read === r));
    expect(new Set(writes.map((r) => r.permissions.join()))).toEqual(new Set(['users.write']));
    expect(new Set(ALL.map((r) => r.tags.join()))).toEqual(new Set(['users']));
  });

  it('refuses an id that is not a uuid', () => {
    expect(usersRoutes.read.params.safeParse({ id: 'x' }).success).toBe(false);
    expect(usersRoutes.remove.params.parse({ id: ID })).toEqual({ id: ID });
  });

  it('reads a page of views and refuses an unknown role', () => {
    const answer = { items: [view], total: 1, page: 1, pageSize: 25 };
    const page = usersRoutes.list.response.parse(answer);
    expect(page.items[0]).toEqual(view);
    const bad = { ...view, role: 'owner' };
    expect(usersRoutes.list.response.safeParse({ ...page, items: [bad] }).success).toBe(false);
  });

  it('reads a detail with its edit fields and a credential shown once', () => {
    const detail = { ...view, locale: 'ar', tz: 'Asia/Riyadh', disabled_reason: null };
    expect(usersRoutes.read.response.parse(detail)).toEqual(detail);
    const issued = { user: detail, credential: { kind: 'password', value: 'secret-1' } };
    expect(usersRoutes.create.response.parse(issued)).toEqual(issued);
    const odd = { user: detail, credential: { kind: 'otp', value: '1' } };
    expect(usersRoutes.resetPassword.response.safeParse(odd).success).toBe(false);
  });

  it('answers nothing for sign-out and delete', () => {
    expect(usersRoutes.signOut.response).toBe('empty');
    expect(usersRoutes.remove.response).toBe('empty');
  });
});
