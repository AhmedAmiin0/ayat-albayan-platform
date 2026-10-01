import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { fakeDb } from '../guardians/fake-db';
import { MeService } from './me.service';

const A = 'ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]';
const B = 'ExponentPushToken[bbbbbbbbbbbbbbbbbbbbbb]';

describe('MeService push tokens (R-MOB-01)', () => {
  it('add: appends to the caller’s own profile row', async () => {
    const { db, argsOf } = fakeDb({ profiles: [{ data: { push_tokens: [A] } }, {}] });
    await new MeService(db).addPushToken('admin-1', B);
    expect(argsOf('profiles', 'eq')).toEqual(['id', 'admin-1']);
    expect(argsOf('profiles', 'update')).toEqual([{ push_tokens: [A, B] }]);
  });

  it('add: takes the token off any other profile (a handed-over phone)', async () => {
    const other = { id: 'admin-2', push_tokens: [A, B] };
    const { db, calls } = fakeDb({ profiles: [{ data: { push_tokens: [] } }, {}, { data: [other] }, {}] });
    await new MeService(db).addPushToken('admin-1', A);
    expect(calls).toContainEqual({ table: 'profiles', method: 'contains', args: ['push_tokens', [A]] });
    expect(calls).toContainEqual({ table: 'profiles', method: 'neq', args: ['id', 'admin-1'] });
    const writes = calls.filter((c) => c.method === 'update' || c.method === 'eq').map((c) => c.args);
    expect(writes.slice(-2)).toEqual([[{ push_tokens: [B] }], ['id', 'admin-2']]);
  });

  it('add: a token already stored writes nothing (idempotent)', async () => {
    const { db, argsOf } = fakeDb({ profiles: [{ data: { push_tokens: [A] } }] });
    await new MeService(db).addPushToken('admin-1', A);
    expect(argsOf('profiles', 'update')).toBeUndefined();
  });

  it('remove: drops the token; an unknown one writes nothing', async () => {
    const { db, argsOf } = fakeDb({ profiles: [{ data: { push_tokens: [A, B] } }, {}] });
    await new MeService(db).removePushToken('admin-1', A);
    expect(argsOf('profiles', 'update')).toEqual([{ push_tokens: [B] }]);

    const other = fakeDb({ profiles: [{ data: { push_tokens: [B] } }] });
    await new MeService(other.db).removePushToken('admin-1', A);
    expect(other.argsOf('profiles', 'update')).toBeUndefined();
  });

  it('404 when the caller has no profile row', async () => {
    const { db } = fakeDb({ profiles: [{ data: null }] });
    await expect(new MeService(db).addPushToken('ghost', A)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('a failed write surfaces as an error', async () => {
    const { db } = fakeDb({
      profiles: [{ data: { push_tokens: [] } }, { error: { code: 'XX000', message: 'boom' } }],
    });
    await expect(new MeService(db).addPushToken('admin-1', A)).rejects.toThrow(/boom/);
  });
});
