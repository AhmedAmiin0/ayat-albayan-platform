import { describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../../common/audit/audit.service';
import { fakeDb, type FakeResult } from '../guardians/fake-db';
import { ModerationQueries, principalColumns, principalOf } from './moderation.queries';
import { RecordingQueries } from './recording.queries';

const setup = (results: Record<string, FakeResult[]>) => {
  const f = fakeDb(results);
  const audit = { record: vi.fn().mockResolvedValue(undefined) };
  return { ...f, audit, q: new ModerationQueries(f.db, audit as unknown as AuditService) };
};
const target = { identity: 'guest-0123456789ab', role: 'guest', name: 'سهيلة' };

describe('principals', () => {
  it('map to exactly one of user_id / join_link_id', () => {
    expect(principalColumns({ userId: 'u' })).toEqual({ user_id: 'u', join_link_id: null });
    expect(principalColumns({ joinLinkId: 'l' })).toEqual({ user_id: null, join_link_id: 'l' });
  });

  it('come back from a participant row (the link wins; none when both are gone)', () => {
    expect(principalOf({ user_id: null, join_link_id: 'l' })).toEqual({ joinLinkId: 'l' });
    expect(principalOf({ user_id: 'u', join_link_id: null })).toEqual({ userId: 'u' });
    expect(principalOf({ user_id: null, join_link_id: null })).toBeNull();
  });
});

describe('ModerationQueries', () => {
  it('isBlocked looks up this lesson and this principal', async () => {
    const { q, calls } = setup({ classroom_blocks: [{ data: [{ id: 'b' }] }, { data: [] }] });
    expect(await q.isBlocked('L', { joinLinkId: 'l' })).toBe(true);
    expect(await q.isBlocked('L', { userId: 'u' })).toBe(false);
    const eqs = calls.filter((c) => c.method === 'eq').map((c) => c.args);
    expect(eqs).toEqual([['lesson_id', 'L'], ['join_link_id', 'l'], ['lesson_id', 'L'], ['user_id', 'u']]);
  });

  it('block inserts once and audits; a second block of the same principal is not an error', async () => {
    const { q, argsOf, audit } = setup({ classroom_blocks: [{ error: { code: '23505', message: 'duplicate' } }] });
    await q.block({ lessonId: 'L', principal: { userId: 'u' }, blockedBy: 'a', target });
    expect(argsOf('classroom_blocks', 'insert')?.[0]).toEqual({ lesson_id: 'L', blocked_by: 'a', user_id: 'u', join_link_id: null });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ actorId: 'a', entity: 'lessons', entityId: 'L', action: 'participant_removed' }));
  });

  it('block surfaces other database errors (and audits nothing)', async () => {
    const { q, audit } = setup({ classroom_blocks: [{ error: { code: '42501', message: 'denied' } }] });
    await expect(q.block({ lessonId: 'L', principal: { userId: 'u' }, blockedBy: 'a', target })).rejects.toThrow();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('participant matches lesson and identity together', async () => {
    const { q, argsOf } = setup({ classroom_participants: [{ data: null }] });
    expect(await q.participant('L', 'guest-x')).toBeNull();
    expect(argsOf('classroom_participants', 'match')?.[0]).toEqual({ lesson_id: 'L', identity: 'guest-x' });
  });
});

describe('RecordingQueries', () => {
  it('claim returns the new id, or null when a recording is already running (unique index)', async () => {
    const f = fakeDb({ lesson_recordings: [{ data: { id: 'R1' } }, { error: { code: '23505', message: 'dup' } }] });
    const q = new RecordingQueries(f.db);
    const input = { target: { kind: 'lesson' as const, id: 'L' }, filePath: 'lessons/L/x.mp4', startedAt: '2026-10-05T16:00:00.000Z' };
    expect(await q.claim(input)).toBe('R1');
    expect(await q.claim(input)).toBeNull();
  });

  it('finishByEgress only touches a running row of that egress (replays are no-ops)', async () => {
    const f = fakeDb({ lesson_recordings: [{}] });
    await new RecordingQueries(f.db).finishByEgress('EG', { status: 'done', endedAt: 't' });
    expect(f.argsOf('lesson_recordings', 'update')?.[0]).toEqual({ status: 'done', ended_at: 't', error: null });
    const eqs = f.calls.filter((c) => c.method === 'eq').map((c) => c.args);
    expect(eqs).toEqual([['egress_id', 'EG'], ['status', 'recording']]);
  });
});
