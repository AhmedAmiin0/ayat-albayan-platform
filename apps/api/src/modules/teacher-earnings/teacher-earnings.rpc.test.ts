import type { PostgrestError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { errorCode } from '../scheduling/errors';
import { rpcError } from '../scheduling/rpc';

const raised = (message: string) => ({ code: 'P0001', message, details: '', hint: '', name: 'PostgrestError' }) as PostgrestError;

describe('record_teacher_payment errors (migration 178)', () => {
  it.each(['over_payment', 'earning_not_found', 'amount_mismatch'])('%s → 409 with that code', (message) => {
    expect(errorCode(rpcError(raised(message)))).toBe(message);
  });
  it('another P0001 message stays a plain error', () => {
    const e = rpcError(raised('boom'));
    expect(errorCode(e)).toBeUndefined();
  });
});
