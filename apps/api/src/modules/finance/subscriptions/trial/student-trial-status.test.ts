import { describe, expect, it, vi } from 'vitest';
import type { LessonEvents, LessonsChangedListener } from '@/common/infra/events/lesson-events';
import type { StudentStatusQueries } from '@/modules/finance/subscriptions/student-lifecycle/student-status.queries';
import { StudentTrialStatus } from './student-trial-status';
import type { TrialLessonRow } from './student-trial.plan';
import type { StudentTrialQueries } from './student-trial.queries';

const trialLesson = (student_id: string, status: 'scheduled' | 'completed' | 'no_show'): TrialLessonRow => ({
  student_id,
  attendance: null,
  chargeable: true,
  lesson: { status, rule_id: 'r1', instant: false, makeup_of_id: null, rule: { package: 'trial' } },
});

type SetupOpts = { statuses?: Record<string, string>; rows?: TrialLessonRow[]; moved?: boolean; paid?: boolean };
function setup(o: SetupOpts = {}) {
  const map = o.statuses ?? { s1: 'new' };
  const statuses = {
    student: vi.fn(async (id: string) => (map[id] ? { status: map[id], tz: 'Asia/Riyadh' } : null)),
    move: vi.fn(async () => o.moved ?? true),
    hasPositivePayment: vi.fn(async () => o.paid ?? false),
  };
  const queries = {
    studentsOfTrialLessons: vi.fn(async () => Object.keys(map)),
    lessonsOf: vi.fn(async () => o.rows ?? []),
  };
  const listeners: LessonsChangedListener[] = [];
  const events = { onChanged: vi.fn((l: LessonsChangedListener) => listeners.push(l)) };
  const s = new StudentTrialStatus(
    statuses as unknown as StudentStatusQueries,
    queries as unknown as StudentTrialQueries,
    events as unknown as LessonEvents,
  );
  return { s, statuses, queries, listeners };
}
type Audited = { from: string; to: string; reason: string; actorId?: string | null };
const audit = ({ from, to, reason, actorId = 'a1' }: Audited) => [
  { studentId: 's1', from, to },
  { actorId, after: { via: 'trial', from, to, reason } },
];

describe('StudentTrialStatus.evaluate: trialMove, compare-and-set and audited (owner 2026-10-15)', () => {
  it('new with an open trial lesson → trial (trial_booked)', async () => {
    const t = setup({ rows: [trialLesson('s1', 'scheduled')] });
    expect(await t.s.evaluate(['s1', 's1'], 'a1')).toBe(1);
    expect(t.statuses.move).toHaveBeenCalledWith(...audit({ from: 'new', to: 'trial', reason: 'trial_booked' }));
    expect(t.queries.lessonsOf).toHaveBeenCalledWith(['s1']);
  });

  it('new or trial with an attended trial lesson → pending_subscription', async () => {
    for (const from of ['new', 'trial']) {
      const t = setup({ statuses: { s1: from }, rows: [trialLesson('s1', 'completed')] });
      await t.s.evaluate(['s1'], 'a1');
      expect(t.statuses.move).toHaveBeenCalledWith(...audit({ from, to: 'pending_subscription', reason: 'trial_attended' }));
    }
  });

  it('attended but already paid → no move; the payment is read only for an attended trial', async () => {
    const t = setup({ statuses: { s1: 'trial' }, rows: [trialLesson('s1', 'completed')], paid: true });
    expect(await t.s.evaluate(['s1'], 'a1')).toBe(0);
    expect(t.statuses.move).not.toHaveBeenCalled();
    expect(t.statuses.hasPositivePayment).toHaveBeenCalledWith('s1');
    const open = setup({ rows: [trialLesson('s1', 'scheduled')], paid: true });
    expect(await open.s.evaluate(['s1'], 'a1')).toBe(1);
    expect(open.statuses.hasPositivePayment).not.toHaveBeenCalled();
  });

  it('trial with its lesson missed and nothing else booked → new (trial_missed)', async () => {
    const t = setup({ statuses: { s1: 'trial' }, rows: [trialLesson('s1', 'no_show')] });
    await t.s.evaluate(['s1'], null);
    expect(t.statuses.move).toHaveBeenCalledWith(...audit({ from: 'trial', to: 'new', reason: 'trial_missed', actorId: null }));
  });

  it('subscribed, paused, churned, unknown students or nothing to do: no move', async () => {
    for (const status of ['pending_subscription', 'active', 'pending_renewal', 'expired', 'paused', 'churned']) {
      const t = setup({ statuses: { s1: status }, rows: [trialLesson('s1', 'completed')] });
      expect(await t.s.evaluate(['s1'], 'a1')).toBe(0);
      expect(t.statuses.move).not.toHaveBeenCalled();
    }
    const unknown = setup({ statuses: {} });
    expect(await unknown.s.evaluate(['s9'], 'a1')).toBe(0);
    expect(await unknown.s.evaluate([], 'a1')).toBe(0);
    expect(unknown.queries.lessonsOf).toHaveBeenCalledTimes(1);
  });

  it('never throws: a failed read or move is logged and counted as no move', async () => {
    const t = setup({ rows: [trialLesson('s1', 'scheduled')] });
    t.statuses.move.mockRejectedValueOnce(new Error('db down'));
    expect(await t.s.evaluate(['s1'], 'a1')).toBe(0);
    t.queries.lessonsOf.mockRejectedValueOnce(new Error('db down'));
    expect(await t.s.evaluate(['s1'], 'a1')).toBe(0);
  });
});

describe('StudentTrialStatus listens to lesson changes (trial lessons only)', () => {
  it('registers on LessonEvents; a change evaluates the trial lessons’ students with no actor', async () => {
    const t = setup({ rows: [trialLesson('s1', 'completed')] });
    t.s.onModuleInit();
    await t.listeners[0]?.(['L1']);
    expect(t.queries.studentsOfTrialLessons).toHaveBeenCalledWith(['L1']);
    expect(t.statuses.move).toHaveBeenCalledWith(...audit({ from: 'new', to: 'pending_subscription', reason: 'trial_attended', actorId: null }));
  });

  it('a failed lookup is logged, never thrown', async () => {
    const t = setup();
    t.queries.studentsOfTrialLessons.mockRejectedValueOnce(new Error('db down'));
    expect(await t.s.afterLessons(['L1'])).toBe(0);
  });
});
