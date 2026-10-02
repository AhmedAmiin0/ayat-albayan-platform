import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../common/auth/verify-token';
import { assertCanSend, assertPhone, TeacherScopes, type TeacherScope } from './teacher-scope';
import type { TeacherThreadsQueries } from './teacher-threads.queries';

const GUARDIAN = '+966501234567';
const OWN = '+201001234567';
const user = (role: AuthUser['role']): AuthUser => ({ id: 'p1', email: null, role });
const scope: TeacherScope = { teacherId: 'tch-1', teacherName: 'أبرار', phones: new Set([GUARDIAN, OWN]), ownPhone: OWN };

function scopes(teacher: { id: string; display_name_ar: string; phone_e164: string | null } | null) {
  const queries = { teacher: vi.fn(async () => teacher), phones: vi.fn(async () => [GUARDIAN, OWN]) };
  return { queries, scopes: new TeacherScopes(queries as unknown as TeacherThreadsQueries) };
}
const failure = (fn: () => unknown): [number, unknown] | null => {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof HttpException ? [e.getStatus(), (e.getResponse() as { code?: string }).code] : null;
  }
};

describe('TeacherScopes.of (R-TCH-03, rule 9)', () => {
  it('an admin has no scope (sees everything) and nothing is read', async () => {
    const { queries, scopes: s } = scopes(null);
    expect(await s.of(user('admin'))).toBeNull();
    expect(queries.teacher).not.toHaveBeenCalled();
  });

  it('a teacher: their row and the phone set from teacher_thread_phones', async () => {
    const { queries, scopes: s } = scopes({ id: 'tch-1', display_name_ar: 'أبرار', phone_e164: OWN });
    expect(await s.of(user('teacher'))).toEqual(scope);
    expect(queries.teacher).toHaveBeenCalledWith('p1');
    expect(queries.phones).toHaveBeenCalledWith('tch-1');
  });

  it('a teacher login without a teachers row → 404 teacher_not_linked', async () => {
    const err = await scopes(null).scopes.of(user('teacher')).catch((e: unknown) => e);
    expect(err instanceof HttpException && [err.getStatus(), err.getResponse()]).toEqual([
      404,
      { code: 'teacher_not_linked', message: 'teacher_not_linked' },
    ]);
  });

  it('any other role → 403', async () => {
    const err = await scopes(null).scopes.of(user('guardian')).catch((e: unknown) => e);
    expect(err instanceof HttpException && err.getStatus()).toBe(403);
  });
});

describe('assertPhone / assertCanSend', () => {
  it.each([
    ['my family, read', () => assertPhone(scope, GUARDIAN), null],
    ['my own chat, read', () => assertPhone(scope, OWN), null],
    ['another family, read', () => assertPhone(scope, '+966559999999'), [403, 'not_your_thread']],
    ['my family, send', () => assertCanSend(scope, GUARDIAN), null],
    ['my own chat, send', () => assertCanSend(scope, OWN), [403, 'own_thread_read_only']],
    ['another family, send', () => assertCanSend(scope, '+966559999999'), [403, 'not_your_thread']],
  ])('%s', (_name, fn, expected) => expect(failure(fn)).toEqual(expected));
});
