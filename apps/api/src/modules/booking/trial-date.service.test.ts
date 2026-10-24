import { HttpException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IDS, NOW } from './booking.fakes';
import { ACTOR, fakeTrialDates, OLD, OTHER_TEACHER, REQUEST, trialRequest, trialRow } from './trial-date.fakes';

const code = async (p: Promise<unknown>) => {
  const e = await p.catch((err: unknown) => err);
  return e instanceof HttpException ? [e.getStatus(), (e.getResponse() as { code: string }).code] : e;
};
const pickOf = (s: ReturnType<typeof fakeTrialDates>) => s.trialQueries.pick.mock.calls[0]?.[0];

describe('TrialDates: a new trial date for an existing student (owner 2026-10-25)', () => {
  beforeEach(() => vi.useFakeTimers({ now: NOW, toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('an upcoming trial MOVES: old → rescheduled, the new row on its rule with rescheduled_from_id, id = the request id', async () => {
    const s = fakeTrialDates({ rows: [trialRow()] });
    const result = await s.service.pick(await s.service.target(trialRequest()), ACTOR);
    const p = pickOf(s);
    expect(p?.booking).toBeUndefined();
    expect(p?.change?.changes).toEqual([{ id: OLD, from_status: 'scheduled', to_status: 'rescheduled', chargeable: false }]);
    expect(p?.change?.lessons).toEqual([
      expect.objectContaining({ id: REQUEST, rule_id: 'rule-old', rescheduled_from_id: OLD, starts_at: '2026-10-04T14:00:00.000Z', ends_at: '2026-10-04T14:30:00.000Z', student_ids: [IDS.s1] }),
    ]);
    expect(p?.change?.audit).toMatchObject({ entity: 'lessons', entity_id: OLD, action: 'trial_new_date' });
    expect(p?.student_ids).toEqual([IDS.s1]);
    expect(result).toMatchObject({ lesson_id: REQUEST, moved_from_id: OLD });
  });

  it('the guardian gets the booking confirmation of the NEW lesson (dedup on the new id)', async () => {
    const s = fakeTrialDates({ rows: [trialRow()] });
    await s.service.pick(await s.service.target(trialRequest()), ACTOR);
    expect(pickOf(s)?.change?.messages).toEqual([
      expect.objectContaining({ guardian_id: IDS.g1, lesson_id: REQUEST, dedup_key: `booking_confirmation:${REQUEST}:${IDS.g1}` }),
    ]);
  });

  it('no upcoming trial (only a past, attended one): a new trial booking through create_booking, marked in its audit', async () => {
    const s = fakeTrialDates({ status: 'pending_subscription', rows: [trialRow({ status: 'completed', starts_at: '2026-09-20T14:00:00+00:00' })] });
    const target = await s.service.target(trialRequest());
    expect(target.old).toBeNull();
    const result = await s.service.pick(target, ACTOR);
    const p = pickOf(s);
    expect(p?.change).toBeUndefined();
    expect(p?.booking).toMatchObject({ student_ids: [IDS.s1], rule: { package: 'trial', client_request_id: REQUEST }, audit: { after: { via: 'trial_new_date', kind: 'trial' } } });
    expect(result.moved_from_id).toBeNull();
  });

  it('the status move to trial is the RPC’s (one transaction); the booking’s idempotent re-check runs after', async () => {
    const s = fakeTrialDates({ status: 'new' });
    await s.service.pick(await s.service.target(trialRequest()), ACTOR);
    expect(pickOf(s)?.student_ids).toEqual([IDS.s1]);
    expect(s.alert.trial.evaluate).toHaveBeenCalledWith([IDS.s1], ACTOR);
  });

  it('a running subscription is refused before anything is planned (409 trial_date_subscribed)', async () => {
    for (const status of ['active', 'pending_renewal', 'expired', 'paused'] as const) {
      const s = fakeTrialDates({ status });
      expect(await code(s.service.target(trialRequest()))).toEqual([409, 'trial_date_subscribed']);
    }
  });

  it('not one existing student’s trial → 400 trial_date_invalid', async () => {
    const s = fakeTrialDates();
    for (const over of [{ studentIds: [IDS.s1, IDS.s2] }, { package: '8', invoice: { source: 'upload', path: 'x/a.png' } }])
      expect(await code(s.service.target(trialRequest(over)))).toEqual([400, 'trial_date_invalid']);
  });

  it('the conflict check skips the moved trial; any other clash is a 409 unless overridden', async () => {
    const s = fakeTrialDates({ rows: [trialRow({ starts_at: '2026-10-04T14:15:00+00:00', ends_at: '2026-10-04T14:45:00+00:00' })] });
    s.busy.studentLessons.mockResolvedValue([{ id: OLD, starts_at: new Date('2026-10-04T14:15:00Z'), ends_at: new Date('2026-10-04T14:45:00Z'), student_id: IDS.s1 }]);
    const target = await s.service.target(trialRequest());
    expect(await s.service.check(target)).toEqual([]);
    s.busy.teacherLessons.mockResolvedValue([{ id: 'T9', starts_at: new Date('2026-10-04T14:00:00Z'), ends_at: new Date('2026-10-04T14:30:00Z') }]);
    expect(await code(s.service.pick(target, ACTOR))).toEqual([409, 'conflict']);
    expect(s.trialQueries.pick).not.toHaveBeenCalled();
  });

  it('a replay (same request id) returns the first pick and writes nothing', async () => {
    const s = fakeTrialDates();
    const first = { lesson_id: REQUEST, starts_at: 'x', ends_at: 'y', teacher_id: IDS.teacher, moved_from_id: OLD };
    s.trialQueries.replay.mockResolvedValue(first);
    expect(await s.service.replay(trialRequest(), ACTOR)).toEqual(first);
    expect(s.trialQueries.pick).not.toHaveBeenCalled();
    expect(s.alert.push.notifyProfiles).not.toHaveBeenCalled();
  });

  it('two identical requests at once: the loser’s failed write returns the winner’s pick', async () => {
    const s = fakeTrialDates({ rows: [trialRow()] });
    const won = { lesson_id: REQUEST, starts_at: 'x', ends_at: 'y', teacher_id: IDS.teacher, moved_from_id: OLD };
    s.trialQueries.pick.mockRejectedValue(new Error('trial_changed'));
    s.trialQueries.replay.mockResolvedValue(won);
    expect(await s.service.pick(await s.service.target(trialRequest()), ACTOR)).toEqual(won);
  });

  it('teacher alert: another teacher hears of the new student; the same teacher gets no new alert; the sender is kicked', async () => {
    const same = fakeTrialDates({ rows: [trialRow()] });
    await same.service.pick(await same.service.target(trialRequest()), ACTOR);
    expect(same.alert.queries.lessons).not.toHaveBeenCalled();
    expect(same.alert.sender.kick).toHaveBeenCalled();
    expect(same.events.changed).toHaveBeenCalledWith([OLD, REQUEST]);
    const other = fakeTrialDates({ rows: [trialRow({ teacher_id: OTHER_TEACHER })] });
    await other.service.pick(await other.service.target(trialRequest()), ACTOR);
    expect(other.alert.queries.lessons).toHaveBeenCalledWith([REQUEST]);
  });

  it('a sibling trial moves with all its students (like a reschedule)', async () => {
    const s = fakeTrialDates({ rows: [trialRow()], lessonStudents: [IDS.s1, IDS.s2] });
    const target = await s.service.target(trialRequest());
    expect(target.req.studentIds).toEqual([IDS.s1, IDS.s2]);
    await s.service.pick(target, ACTOR);
    expect(pickOf(s)?.change?.lessons?.[0]?.student_ids).toEqual([IDS.s1, IDS.s2]);
  });
});
