import { describe, expect, it, vi } from 'vitest';
import { conflict } from '@/common/http/errors';
import { appliedChange, fakeStore } from '@/modules/teaching/lessons/lessons.fakes';
import type { OpenEndedLesson } from './auto-held.plan';
import type { AutoHeldRepo } from './auto-held.repo';
import { OutcomeSettleService } from './outcome-settle.service';

const NOW = new Date('2026-11-04T12:00:00Z');
const SINCE = new Date('2026-11-03T09:00:00Z');
const GRACE = 30 * 60_000;
const SENT = Date.parse('2026-11-04T09:00:00Z');
const PASS = { now: NOW, graceMs: GRACE };
const open = (id: string, over: Partial<OpenEndedLesson> = {}): OpenEndedLesson => ({
  id,
  status: 'scheduled',
  ends_at: '2026-11-04T10:00:00Z',
  lesson_students: [{ student_id: 's1', student: { tz: 'Africa/Cairo' } }],
  ...over,
});

function setup(lessons: OpenEndedLesson[], reminded: string[] = []) {
  const deps = fakeStore();
  const repo = {
    outcomesSince: vi.fn(async () => SINCE),
    openEnded: vi.fn(async () => lessons),
    reminded: vi.fn(async () => new Map(reminded.map((id) => [id, SENT]))),
  };
  const service = new OutcomeSettleService(repo as unknown as AutoHeldRepo, deps.store);
  return { ...deps, repo, service };
}

describe('OutcomeSettleService (owner 2026-11-03, confirmation required)', () => {
  it('reads [max(cutoff, now − 14 d), now − grace] and the reminders of what it read', async () => {
    const { service, repo } = setup([open('a')]);
    await service.runOnce({ now: NOW, graceMs: GRACE });
    expect(repo.openEnded).toHaveBeenCalledWith({ from: SINCE, until: new Date('2026-11-04T11:30:00Z') });
    expect(repo.reminded).toHaveBeenCalledWith(['a']);
  });

  it('confirmed → completed (auto_held); reminded scheduled → no_show (auto_no_show); else left', async () => {
    const lessons = [open('c', { status: 'confirmed' }), open('r'), open('u')];
    const { service, writer, record } = setup(lessons, ['r']);
    expect(await service.runOnce({ now: NOW, graceMs: GRACE })).toEqual({
      held: 1, absent: 1, unresolved: 1, waiting: 0, skipped: 0, lost: 0,
    });
    expect(writer.apply).toHaveBeenCalledTimes(2);
    expect(appliedChange(writer)).toEqual({
      actor: null,
      changes: [{ id: 'c', from_status: 'confirmed', to_status: 'completed' }],
    });
    expect(appliedChange(writer, 1)).toEqual({
      actor: null,
      changes: [{ id: 'r', from_status: 'scheduled', to_status: 'no_show' }],
    });
    expect(record).toHaveBeenLastCalledWith(expect.objectContaining({
      actorId: null, entityId: 'r', action: 'status_change',
      before: { status: 'scheduled' }, after: { status: 'no_show', reason: 'auto_no_show' },
    }));
  });

  it('no retro: a lesson read that ended before the cutoff is skipped, never written', async () => {
    const { service, writer } = setup([open('old', { ends_at: '2026-11-03T08:59:00Z' })], ['old']);
    expect(await service.runOnce(PASS)).toMatchObject({ skipped: 1, absent: 0 });
    expect(writer.apply).not.toHaveBeenCalled();
  });

  it('inside the grace: waits; another status: skipped', async () => {
    const lessons = [open('w', { ends_at: '2026-11-04T11:45:00Z' }), open('x', { status: 'excused' })];
    const { service, writer } = setup(lessons, ['w', 'x']);
    expect(await service.runOnce(PASS)).toMatchObject({ waiting: 1, skipped: 1 });
    expect(writer.apply).not.toHaveBeenCalled();
  });

  it('idempotent: a lost compare-and-set or a failed write counts as lost, never throws', async () => {
    const { service, writer } = setup([open('a'), open('b', { status: 'confirmed' })], ['a']);
    writer.apply.mockRejectedValueOnce(conflict('invalid_transition')).mockRejectedValueOnce(new Error('db'));
    expect(await service.runOnce(PASS)).toMatchObject({ held: 0, absent: 0, lost: 2 });
  });

  it('no cutoff (migration 1000 not applied): the pass fails before reading any lesson', async () => {
    const { service, repo } = setup([open('a')], ['a']);
    repo.outcomesSince.mockRejectedValueOnce(new Error('function does not exist'));
    await expect(service.runOnce({ now: NOW, graceMs: GRACE })).rejects.toThrow();
    expect(repo.openEnded).not.toHaveBeenCalled();
  });

  it('«عدّل الوقت» after the reminder: that reminder was about the old time, left unresolved', async () => {
    const edited = open('e', { time_edited_at: '2026-11-04T09:30:00Z' });
    const before = open('b', { time_edited_at: '2026-11-04T08:00:00Z' });
    const { service, writer } = setup([edited, before], ['e', 'b']);
    expect(await service.runOnce(PASS)).toMatchObject({ absent: 1, unresolved: 1 });
    expect(appliedChange(writer)?.changes[0]).toMatchObject({ id: 'b', to_status: 'no_show' });
  });
});
