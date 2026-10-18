import { ConflictException } from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import type { Db } from '../../common/db/db.module';
import { errorCode } from './errors';
import { callRpc, rpcError } from './rpc';

const pgError = (code: string, message: string): PostgrestError =>
  ({ code, message, details: '', hint: '', name: 'PostgrestError' }) as PostgrestError;

describe('rpcError — lesson RPC errors → HTTP (docs/10 §3)', () => {
  it('raised invalid_transition / rule_not_active / stale_time / course_changed → 409 with that code', () => {
    for (const code of ['invalid_transition', 'rule_not_active', 'stale_time', 'course_changed']) {
      const e = rpcError(pgError('P0001', code));
      expect(e).toBeInstanceOf(ConflictException);
      expect(errorCode(e)).toBe(code);
      expect((e as ConflictException).getResponse()).toEqual({ code, message: code });
    }
  });

  it('a unique violation on a generated slot → 409 slot_taken; other unique keys are not', () => {
    const slot = 'duplicate key value violates unique constraint "lessons_rule_date_uidx"';
    expect(errorCode(rpcError(pgError('23505', slot)))).toBe('slot_taken');
    expect(errorCode(rpcError(pgError('23505', 'duplicate key "messages_dedup_key_key"')))).toBeUndefined();
  });

  it('any other P0001 or unknown error is not dressed up as a domain error', () => {
    expect(errorCode(rpcError(pgError('P0001', 'something else')))).toBeUndefined();
    expect(rpcError(pgError('XX000', 'boom'))).toBeInstanceOf(Error);
  });
});

describe('callRpc', () => {
  it('passes the function name and args, returns data, throws mapped errors', async () => {
    const calls: unknown[] = [];
    const db = {
      rpc: async (fn: string, args: unknown) => {
        calls.push([fn, args]);
        return fn === 'generate_rule_lessons' ? { data: [1], error: null } : { data: null, error: pgError('P0001', 'rule_not_active') };
      },
    } as unknown as Db;
    expect(await callRpc(db, 'generate_rule_lessons', { p: 1 })).toEqual([1]);
    expect(calls).toEqual([['generate_rule_lessons', { p: 1 }]]);
    await expect(callRpc(db, 'apply_lesson_changes', {})).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('errorCode', () => {
  it('is undefined for non-HTTP errors and bodies without a code', () => {
    expect(errorCode(new Error('x'))).toBeUndefined();
    expect(errorCode(new ConflictException({ message: 'duplicate' }))).toBeUndefined();
  });
});
