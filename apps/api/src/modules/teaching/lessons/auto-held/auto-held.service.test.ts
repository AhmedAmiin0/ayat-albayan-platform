import { autoHeldWindow } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import { conflict } from '@/common/http/errors';
import { readerOf } from '@/common/settings/settings.fakes';
import { appliedChange, fakeStore } from '@/modules/teaching/lessons/lessons.fakes';
import { LessonsSettings } from '@/modules/teaching/lessons/lessons.settings';
import type { OpenEndedLesson } from './auto-held.plan';
import type { AutoHeldRepo } from './auto-held.repo';
import { AutoHeldService } from './auto-held.service';
import type { OutcomeSettleService } from './outcome-settle.service';

const SETTLED = { held: 1, absent: 2, unresolved: 3, waiting: 0, skipped: 0, lost: 0 };

const NOW = new Date('2026-11-02T12:00:00Z');
const open = (id: string, over: Partial<OpenEndedLesson> = {}): OpenEndedLesson => ({
  id,
  status: 'scheduled',
  ends_at: '2026-11-01T15:00:00Z',
  lesson_students: [{ student_id: 's1', student: { tz: 'Asia/Riyadh' } }],
  ...over,
});

function setup(o: { required?: boolean; lessons?: OpenEndedLesson[]; since?: Date } = {}) {
  const deps = fakeStore();
  const repo = {
    outcomesSince: vi.fn(async () => o.since ?? new Date('2026-10-01T00:00:00Z')),
    openEnded: vi.fn(async () => o.lessons ?? [open('l1')]),
    packages: vi.fn(async () => []),
  };
  const settings = readerOf(LessonsSettings, { lesson_confirmation_required: o.required ?? false });
  const settle = { runOnce: vi.fn(async () => SETTLED) };
  const service = new AutoHeldService(
    repo as unknown as AutoHeldRepo,
    deps.store,
    settings,
    settle as unknown as OutcomeSettleService,
  );
  return { ...deps, repo, service, settle };
}

describe('AutoHeldService.runOnce (owner 2026-11-02)', () => {
  it('confirmation required (ON, owner 2026-11-03): OutcomeSettleService with the grace', async () => {
    const { service, repo, writer, settle } = setup({ required: true });
    expect(await service.runOnce(NOW)).toEqual({ mode: 'confirmation_required', ...SETTLED });
    expect(settle.runOnce).toHaveBeenCalledWith({ now: NOW, graceMs: 30 * 60_000 });
    expect(repo.openEnded).not.toHaveBeenCalled();
    expect(writer.apply).not.toHaveBeenCalled();
  });

  it('OFF: an ended open lesson → completed, actor null, attendance and chargeable untouched, audited', async () => {
    const { service, repo, writer, record } = setup({
      lessons: [open('l1'), open('l2', { status: 'confirmed' })],
    });
    expect(await service.runOnce(NOW)).toEqual({ mode: 'held_by_default', due: 2, held: 2, absent: 0 });
    expect(repo.openEnded).toHaveBeenCalledWith(autoHeldWindow(NOW));
    expect(appliedChange(writer)).toEqual({
      actor: null,
      changes: [{ id: 'l1', from_status: 'scheduled', to_status: 'completed' }],
    });
    expect(appliedChange(writer, 1)?.changes[0]).toMatchObject({
      id: 'l2',
      from_status: 'confirmed',
    });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: null,
        entity: 'lessons',
        entityId: 'l1',
        action: 'status_change',
        before: { status: 'scheduled' },
        after: { status: 'completed', reason: 'auto_held' },
      }),
    );
  });

  it('tells LessonEvents (balance alerts, trial status, rating) which lessons changed', async () => {
    const { service, events } = setup();
    const changed = vi.fn(async () => undefined);
    events.onChanged(changed);
    await service.runOnce(NOW);
    expect(changed).toHaveBeenCalledWith(['l1']);
  });

  it('cancelled / excused / reported lessons are never held, even if read', async () => {
    const lessons = [
      open('a', { status: 'cancelled_by_teacher' }),
      open('b', { status: 'excused' }),
      open('c', { status: 'no_show' }),
    ];
    const { service, writer } = setup({ lessons });
    expect(await service.runOnce(NOW)).toMatchObject({ due: 0, held: 0 });
    expect(writer.apply).not.toHaveBeenCalled();
  });

  it('idempotent: a lost compare-and-set (held meanwhile, a report, a cancel) counts nothing and never throws', async () => {
    const { service, writer } = setup({ lessons: [open('l1'), open('l2')] });
    writer.apply
      .mockRejectedValueOnce(conflict('invalid_transition'))
      .mockRejectedValueOnce(new Error('db down'));
    expect(await service.runOnce(NOW)).toEqual({ mode: 'held_by_default', due: 2, held: 0, absent: 0 });
  });

  it('outside the 14-day window or before the 30-minute grace: not held', async () => {
    const lessons = [
      open('old', { ends_at: '2026-10-18T11:59:00Z' }),
      open('fresh', { ends_at: '2026-11-02T11:45:00Z' }),
    ];
    const { service, writer } = setup({ lessons });
    expect(await service.runOnce(NOW)).toMatchObject({ due: 0, held: 0 });
    expect(writer.apply).not.toHaveBeenCalled();
  });

  it('OFF never reads before lesson_outcomes_since() (the deploy): no retro change', async () => {
    const since = new Date('2026-11-01T12:00:00Z');
    const { service, repo } = setup({ since });
    await service.runOnce(NOW);
    expect(repo.openEnded).toHaveBeenCalledWith({ ...autoHeldWindow(NOW), from: since });
  });
});
