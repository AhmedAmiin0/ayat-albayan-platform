import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CorrectTo, LessonStatus } from '@ab/shared';
import { readerOf } from '@/common/settings/settings.fakes';
import { ADMIN, appliedChange, fakeStore, LESSON_ID, lessonRow } from '@/modules/teaching/lessons/lessons.fakes';
import { LessonsSettings } from '@/modules/teaching/lessons/lessons.settings';
import type { AutoHeldRepo } from './auto-held.repo';
import { OutcomeCorrection } from './outcome-correction';

// «تصحيح الحالة» (owner 2026-11-03). The fixture lesson ran 14:00–14:45Z on 2026-10-04.
const AFTER = new Date('2026-10-04T16:00:00Z');

interface Setup {
  status?: LessonStatus;
  settled?: boolean;
  paid?: boolean;
  late?: number | null;
}

function setup(o: Setup = {}) {
  const deps = fakeStore(lessonRow({ status: o.status ?? 'scheduled' }));
  const repo = {
    correctable: vi.fn(async (ids: readonly string[]) => new Set(o.settled ? ids : [])),
    paid: vi.fn(async () => o.paid ?? false),
  };
  const settings = readerOf(LessonsSettings, { late_cancel_hours: o.late ?? null });
  const service = new OutcomeCorrection(repo as unknown as AutoHeldRepo, deps.store, settings);
  const correct = (to: CorrectTo) => service.correct({ lessonId: LESSON_ID, to, actor: ADMIN });
  return { ...deps, repo, correct };
}

describe('OutcomeCorrection', () => {
  beforeEach(() => vi.useFakeTimers({ now: AFTER }));
  afterEach(() => vi.useRealTimers());

  it('an ended «يحتاج تأكيد» lesson → each target, with its attendance and charge', async () => {
    const cases = [
      ['completed', { attendance: 'on_time', chargeable: true }],
      ['no_show', { attendance: 'absent', chargeable: true }],
      ['excused', { attendance: 'excused', chargeable: false }],
      ['cancelled_by_teacher', { chargeable: false }],
    ] as const;
    for (const [to, fields] of cases) {
      const { correct, writer, record } = setup();
      expect(await correct(to)).toBe(LESSON_ID);
      expect(appliedChange(writer)?.changes[0]).toMatchObject({ from_status: 'scheduled', to_status: to, ...fields });
      expect(record).toHaveBeenCalledWith(expect.objectContaining({
        actorId: ADMIN.id, action: 'status_change',
        after: expect.objectContaining({ status: to, reason: 'outcome_correction' }),
      }));
    }
  });

  it('an excuse after the start is counted when late_cancel_hours is set (the cancel rule)', async () => {
    const { correct, writer } = setup({ late: 24 });
    await correct('excused');
    expect(appliedChange(writer)?.changes[0]).toMatchObject({ chargeable: true });
  });

  it('a lesson the job settled: absent → held, held → absent', async () => {
    for (const [from, to] of [['no_show', 'completed'], ['completed', 'no_show']] as const) {
      const { correct, writer } = setup({ status: from, settled: true });
      await correct(to);
      expect(appliedChange(writer)?.changes[0]).toMatchObject({ from_status: from, to_status: to });
    }
  });

  it('recorded by hand or reported (not settled by the job): 409 not_auto_held', async () => {
    const { correct, writer } = setup({ status: 'completed' });
    await expect(correct('no_show')).rejects.toMatchObject({ response: { code: 'not_auto_held' } });
    expect(writer.apply).not.toHaveBeenCalled();
  });

  it('settled over 14 days ago, or an open lesson before its end: 409 not_auto_held', async () => {
    vi.setSystemTime(new Date('2026-10-19T00:00:00Z'));
    await expect(setup({ status: 'no_show', settled: true }).correct('completed')).rejects.toMatchObject({
      response: { code: 'not_auto_held' },
    });
    vi.setSystemTime(new Date('2026-10-04T14:30:00Z'));
    await expect(setup().correct('no_show')).rejects.toMatchObject({ response: { code: 'not_auto_held' } });
  });

  it('the same status: 409 invalid_transition; a paid earning: 409 earning_paid', async () => {
    await expect(setup({ status: 'no_show', settled: true }).correct('no_show')).rejects.toMatchObject({
      response: { code: 'invalid_transition' },
    });
    await expect(setup({ status: 'completed', settled: true, paid: true }).correct('no_show')).rejects.toMatchObject({
      response: { code: 'earning_paid' },
    });
  });
});
