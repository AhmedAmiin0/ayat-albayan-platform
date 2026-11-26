import { Test } from '@nestjs/testing';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { featureRoot } from '@/common/infra/test-root';
import { TestAccountsModule } from './test-accounts.module';
import { bootWith, ROLE_ADMIN, ROLE_USERS } from '@/common/auth/auth.fakes';
import { TestAccountsRepo } from './test-accounts.repo';

const ID = '0b6a0b8e-6d1a-4c3e-9a51-6f1c7f0a2b11';
const LOGIN = '1c6a0b8e-6d1a-4c3e-9a51-6f1c7f0a2b22';
const repo = { set: vi.fn() };

describe('PATCH /admin/users/:id/test and /students/:id/test (docs/56)', () => {
  let app: NestFastifyApplication;
  const patch = (url: string, token: string, payload: object) =>
    app.inject({ method: 'PATCH', url, headers: { authorization: `Bearer ${token}` }, payload });

  beforeAll(async () => {
    const builder = Test.createTestingModule({ imports: [featureRoot(TestAccountsModule)] })
      .overrideProvider(TestAccountsRepo)
      .useValue(repo);
    app = await bootWith(builder, ROLE_USERS);
  });
  afterAll(() => app.close());
  beforeEach(() => {
    repo.set.mockReset().mockResolvedValue({ id: ID, is_test: true, profiles: [LOGIN] });
  });

  it('an admin flips a login; the write carries the actor (the audit row)', async () => {
    const res = await patch(`/admin/users/${ID}/test`, 'admin', { is_test: true });
    expect([res.statusCode, res.json()]).toEqual([200, { id: ID, is_test: true }]);
    expect(repo.set).toHaveBeenCalledWith({ kind: 'profile', id: ID, isTest: true, actorId: ROLE_ADMIN });
  });

  it('an admin flips a student', async () => {
    const res = await patch(`/students/${ID}/test`, 'admin', { is_test: false });
    expect(res.statusCode).toBe(200);
    expect(repo.set).toHaveBeenCalledWith({ kind: 'student', id: ID, isTest: false, actorId: ROLE_ADMIN });
  });

  it.each(['sales', 'teacher', 'guardian', 'assistant'])('%s is 403 on both; nothing runs', async (who) => {
    expect((await patch(`/admin/users/${ID}/test`, who, { is_test: true })).statusCode).toBe(403);
    expect((await patch(`/students/${ID}/test`, who, { is_test: true })).statusCode).toBe(403);
    expect(repo.set).not.toHaveBeenCalled();
  });

  it('400 on a bad id or body; 404 when no such row', async () => {
    expect((await patch('/students/x/test', 'admin', { is_test: true })).statusCode).toBe(400);
    expect((await patch(`/students/${ID}/test`, 'admin', { is_test: 'yes' })).statusCode).toBe(400);
    repo.set.mockResolvedValueOnce(null);
    const res = await patch(`/admin/users/${ID}/test`, 'admin', { is_test: true });
    expect([res.statusCode, res.json().code]).toEqual([404, 'user_not_found']);
    repo.set.mockResolvedValueOnce(null);
    const student = await patch(`/students/${ID}/test`, 'admin', { is_test: true });
    expect([student.statusCode, student.json().code]).toEqual([404, 'student_not_found']);
  });
});
