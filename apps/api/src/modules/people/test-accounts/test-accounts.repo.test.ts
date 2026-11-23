import { ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { Db } from '@/common/db/db.module';
import { fakeDb } from '@/common/db/testing/fake-db';
import { TestAccountsRepo } from './test-accounts.repo';

const ID = '0b6a0b8e-6d1a-4c3e-9a51-6f1c7f0a2b11';
const WRITE = { kind: 'student', id: ID, isTest: true, actorId: 'admin1' } as const;
const repoOf = (db: unknown) => new TestAccountsRepo(db as Db);

describe('TestAccountsRepo.set (set_test_flag)', () => {
  it('calls the function with the actor, so the audit row is written in the same transaction', async () => {
    const { db, argsOf } = fakeDb({
      'rpc:set_test_flag': [{ data: { id: ID, is_test: true, profiles: [] } }],
    });
    await expect(repoOf(db).set(WRITE)).resolves.toEqual({ id: ID, is_test: true, profiles: [] });
    expect(argsOf('rpc:set_test_flag', 'rpc')).toEqual([
      { p_kind: 'student', p_id: ID, p_is_test: true, p_actor: 'admin1' },
    ]);
  });

  it('null when no such row; 409 test_family_mismatch on 23514', async () => {
    const { db } = fakeDb({
      'rpc:set_test_flag': [{ data: null }, { error: { code: '23514', message: 'test_family_mismatch' } }],
    });
    await expect(repoOf(db).set(WRITE)).resolves.toBeNull();
    await expect(repoOf(db).set(WRITE)).rejects.toBeInstanceOf(ConflictException);
  });
});
