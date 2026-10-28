import type { PostgrestError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { pauseRpcError } from './course-pause.queries';

const pg = (code: string, message: string): PostgrestError => ({ code, message, details: '', hint: '', name: 'PostgrestError' }) as PostgrestError;
const statusOf = (e: Error) => (e as unknown as { getStatus(): number }).getStatus();

describe('pauseRpcError (migration 951 codes → HTTP)', () => {
  it.each([
    ['date_in_past', 400], ['invalid_range', 400], ['already_paused', 409], ['pause_not_open', 409], ['student_not_found', 404], ['pause_not_found', 404],
  ])('%s → %i', (code, status) => {
    expect(statusOf(pauseRpcError(pg('P0001', code)))).toBe(status);
  });

  it('a lost race on the one-open index reads as already_paused', () => {
    const e = pauseRpcError(pg('23505', 'duplicate key value violates unique constraint "course_pauses_one_open"'));
    expect([statusOf(e), (e as unknown as { getResponse(): { code: string } }).getResponse().code]).toEqual([409, 'already_paused']);
  });

  it('anything else stays a plain DB error', () => {
    expect(pauseRpcError(pg('42P01', 'missing')).message).toMatch(/db error 42P01/);
  });
});
