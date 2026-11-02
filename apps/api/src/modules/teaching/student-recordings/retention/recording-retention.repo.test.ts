import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { RecordingAdminRepo } from '@/modules/teaching/student-recordings/recording-admin.repo';
import { RecordingRetentionRepo, STUCK_ERROR } from './recording-retention.repo';

describe('RecordingRetentionQueries', () => {
  it('failStuck touches only running rows older than the cutoff and returns the count', async () => {
    const f = fakeDb({ lesson_recordings: [{ data: [{ id: 'a' }, { id: 'b' }] }] });
    expect(await new RecordingRetentionRepo(f.db).failStuck({ cutoff: 'C', now: 'N' })).toBe(2);
    expect(f.argsOf('lesson_recordings', 'update')?.[0]).toEqual({ status: 'failed', ended_at: 'N', error: STUCK_ERROR });
    expect(f.argsOf('lesson_recordings', 'eq')).toEqual(['status', 'recording']);
    expect(f.argsOf('lesson_recordings', 'lt')).toEqual(['started_at', 'C']);
  });

  it('expired selects only finished or failed rows ended before the cutoff, oldest first', async () => {
    const f = fakeDb({ lesson_recordings: [{ data: [{ id: 'a', file_path: 'p' }] }] });
    expect(await new RecordingRetentionRepo(f.db).expired({ cutoff: 'C', limit: 5 })).toEqual([{ id: 'a', file_path: 'p' }]);
    expect(f.argsOf('lesson_recordings', 'in')).toEqual(['status', ['done', 'failed']]);
    expect(f.argsOf('lesson_recordings', 'limit')).toEqual([5]);
  });

  it('markDeleted never touches a running or an already deleted row, and hides it from students', async () => {
    const f = fakeDb({ lesson_recordings: [{ data: [{ id: 'R' }] }] });
    expect(await new RecordingAdminRepo(f.db).markDeleted('R', 'T')).toBe(1);
    expect(f.argsOf('lesson_recordings', 'update')?.[0]).toEqual({ status: 'deleted', deleted_at: 'T', visible_to_student: false });
    expect(f.calls.filter((c) => c.method === 'neq').map((c) => c.args)).toEqual([['status', 'deleted'], ['status', 'recording']]);
  });

  it('markDeleted says 0 when nothing changed (already deleted by someone else)', async () => {
    const f = fakeDb({ lesson_recordings: [{ data: [] }] });
    expect(await new RecordingAdminRepo(f.db).markDeleted('R', 'T')).toBe(0);
  });
});
