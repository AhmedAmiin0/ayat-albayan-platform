import type { PostgrestError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import type { Db } from '@/common/db/db.module';
import { CoursePauseRepo, pauseRpcError } from './course-pause.repo';

const pg = (code: string, message: string): PostgrestError => ({ code, message, details: '', hint: '', name: 'PostgrestError' }) as PostgrestError;
const statusOf = (e: Error) => (e as unknown as { getStatus(): number }).getStatus();

describe('pauseRpcError (migration 956 codes → HTTP)', () => {
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

/** A subscriptions update recorder: every filter call, answering the ids `rows`. */
function updateDb(rows: { id: string }[]) {
  const calls: unknown[][] = [];
  const chain: Record<string, unknown> = {};
  for (const m of ['update', 'eq']) chain[m] = (...a: unknown[]) => (calls.push([m, ...a]), chain);
  chain['select'] = (...a: unknown[]) => (calls.push(['select', ...a]), Promise.resolve({ data: rows, error: null }));
  return { calls, db: { from: (t: string) => (calls.push(['from', t]), chain) } as unknown as Db };
}

describe('liftLegacyPause (old package-only pauses)', () => {
  it('lifts EVERY paused package of the student (not only the newest) and answers their ids', async () => {
    const f = updateDb([{ id: 's-new' }, { id: 's-old' }]);
    expect(await new CoursePauseRepo(f.db).liftLegacyPause({ studentId: 'st' })).toEqual(['s-new', 's-old']);
    expect(f.calls).toEqual([['from', 'subscriptions'], ['update', { status: 'unpaid' }], ['eq', 'student_id', 'st'], ['eq', 'status', 'paused'], ['select', 'id']]);
  });

  it('a package row\'s «استئناف» lifts only that row (of this student, still paused)', async () => {
    const f = updateDb([]);
    expect(await new CoursePauseRepo(f.db).liftLegacyPause({ studentId: 'st', subscriptionId: 'sub' })).toEqual([]);
    expect(f.calls).toContainEqual(['eq', 'id', 'sub']);
    expect(f.calls).toContainEqual(['eq', 'student_id', 'st']);
  });
});
