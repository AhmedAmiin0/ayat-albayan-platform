import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { fakeDb } from '../guardians/fake-db';
import { MeService } from './me.service';

const A = 'ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]';
const B = 'ExponentPushToken[bbbbbbbbbbbbbbbbbbbbbb]';

describe('MeService push tokens (R-MOB-01)', () => {
  it('add: appends to the caller’s own profile row', async () => {
    const { db, argsOf } = fakeDb({ profiles: [{ data: { push_tokens: [A] } }, {}] });
    await new MeService(db).addPushToken('admin-1', B, 'sess-1');
    expect(argsOf('profiles', 'eq')).toEqual(['id', 'admin-1']);
    expect(argsOf('profiles', 'update')).toEqual([{ push_tokens: [A, B] }]);
  });

  it('add: takes the token off any other profile (a handed-over phone)', async () => {
    const other = { id: 'admin-2', push_tokens: [A, B] };
    const { db, calls } = fakeDb({ profiles: [{ data: { push_tokens: [] } }, {}, { data: [other] }, {}] });
    await new MeService(db).addPushToken('admin-1', A, 'sess-1');
    expect(calls).toContainEqual({ table: 'profiles', method: 'contains', args: ['push_tokens', [A]] });
    expect(calls).toContainEqual({ table: 'profiles', method: 'neq', args: ['id', 'admin-1'] });
    const writes = calls.filter((c) => c.method === 'update' || c.method === 'eq').map((c) => c.args);
    expect(writes.slice(-2)).toEqual([[{ push_tokens: [B] }], ['id', 'admin-2']]);
  });

  it('add: a token already stored writes nothing (idempotent)', async () => {
    const { db, argsOf } = fakeDb({ profiles: [{ data: { push_tokens: [A] } }] });
    await new MeService(db).addPushToken('admin-1', A, 'sess-1');
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
    await expect(new MeService(db).addPushToken('ghost', A, 'sess-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('a failed write surfaces as an error', async () => {
    const { db } = fakeDb({
      profiles: [{ data: { push_tokens: [] } }, { error: { code: 'XX000', message: 'boom' } }],
    });
    await expect(new MeService(db).addPushToken('admin-1', A, 'sess-1')).rejects.toThrow(/boom/);
  });

  it('add: binds the token to the caller’s session (its end removes the token server-side)', async () => {
    const { db, argsOf } = fakeDb({ profiles: [{ data: { push_tokens: [] } }, {}] });
    await new MeService(db).addPushToken('admin-1', A, 'sess-1');
    expect(argsOf('push_device_sessions', 'upsert')).toEqual([
      { token: A, profile_id: 'admin-1', session_id: 'sess-1' },
      { onConflict: 'token' },
    ]);
  });

  it('add: 401 with no session to bind to, or one that just ended; nothing stored', async () => {
    const none = fakeDb({});
    await expect(new MeService(none.db).addPushToken('admin-1', A, null)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(none.calls).toEqual([]);
    const gone = fakeDb({ push_device_sessions: [{ error: { code: '23503', message: 'fk' } }] });
    await expect(new MeService(gone.db).addPushToken('admin-1', A, 'dead')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(gone.argsOf('profiles', 'update')).toBeUndefined();
  });

  it('remove: also drops the caller’s own binding of that token', async () => {
    const { db, calls } = fakeDb({ profiles: [{ data: { push_tokens: [A] } }, {}] });
    await new MeService(db).removePushToken('admin-1', A);
    const binding = calls.filter((c) => c.table === 'push_device_sessions').map((c) => [c.method, ...c.args]);
    expect(binding).toEqual([['delete'], ['eq', 'token', A], ['eq', 'profile_id', 'admin-1']]);
  });
});
