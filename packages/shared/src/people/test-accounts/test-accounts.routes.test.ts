import { describe, expect, it } from 'vitest';
import { testAccountRoutes } from './test-accounts.routes';

const ID = '0b6a0b8e-6d1a-4c3e-9a51-6f1c7f0a2b11';

describe('testAccountRoutes (docs/56)', () => {
  it('keeps the paths the api serves today', () => {
    const { user, student } = testAccountRoutes;
    expect(`${user.method} ${user.path}`).toBe('PATCH /admin/users/:id/test');
    expect(`${student.method} ${student.path}`).toBe('PATCH /students/:id/test');
  });

  it('takes the one switch and answers the flag as stored', () => {
    expect(testAccountRoutes.user.body.parse({ is_test: true })).toEqual({ is_test: true });
    const stored = { id: ID, is_test: false };
    expect(testAccountRoutes.student.response.parse(stored)).toEqual(stored);
  });

  it.each([
    ['a bad id', () => testAccountRoutes.user.params.safeParse({ id: 'x' })],
    ['an extra field', () => testAccountRoutes.student.body.safeParse({ is_test: true, x: 1 })],
  ])('refuses %s', (_name, parse) => {
    expect(parse().success).toBe(false);
  });
});
