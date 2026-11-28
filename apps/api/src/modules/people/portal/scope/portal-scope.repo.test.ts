import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import { PortalScopeRepo } from './portal-scope.repo';

describe('PortalScopeRepo error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate', async () => {
    const { db } = fakeDb({ 'rpc:portal_students_of': [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(new PortalScopeRepo(db).studentsOf('p1'))).toEqual({
      status: 409,
      body: { message: 'duplicate' },
    });
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ 'rpc:portal_students_of': [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(new PortalScopeRepo(db).studentsOf('p1'))).toEqual({
      status: 500,
      body: 'db error XX000: boom',
    });
  });
});

describe('PortalScopeRepo.testIdsOf: students.is_test (docs/56)', () => {
  it('one read of these ids, test rows only; the ids that are test', async () => {
    const f = fakeDb({ students: [{ data: [{ id: 's2' }] }] });
    expect(await new PortalScopeRepo(f.db).testIdsOf(['s1', 's2'])).toEqual(new Set(['s2']));
    expect(f.argsOf('students', 'select')).toEqual(['id']);
    expect(f.argsOf('students', 'in')).toEqual(['id', ['s1', 's2']]);
    expect(f.argsOf('students', 'eq')).toEqual(['is_test', true]);
  });

  it('no ids: no read', async () => {
    const f = fakeDb({});
    expect(await new PortalScopeRepo(f.db).testIdsOf([])).toEqual(new Set());
    expect(f.argsOf('students', 'select')).toBeUndefined();
  });

  it('a failed read rejects (the scope counts it as real)', async () => {
    const f = fakeDb({ students: [{ error: PG_ERRORS.other }] });
    await expect(new PortalScopeRepo(f.db).testIdsOf(['s1'])).rejects.toThrow();
  });
});
