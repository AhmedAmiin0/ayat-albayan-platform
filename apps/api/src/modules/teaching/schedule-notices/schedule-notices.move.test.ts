import { describe, expect, it } from 'vitest';
import type { ScheduleChange } from '@/common/infra/events/lesson-events';
import { FROM, harness, NOW } from './schedule-notices.fakes';

// A move's family WhatsApp follows FamilyMoveNotice's choice (one family message per move); the
// teacher's lesson_rescheduled goes either way, under its own gate.

const move = (familyNotice?: boolean): ScheduleChange => ({
  kind: 'lesson_rescheduled',
  lessonId: 'L1',
  fromStartsAt: FROM.toISOString(),
  actorId: 'pADMIN',
  ...(familyNotice === undefined ? {} : { familyNotice }),
});
const KEY = (to: string) => expect.stringMatching(new RegExp(`^lesson_rescheduled:L1@\\d+:${to}$`));

describe('ScheduleNotices: a move, one family message', () => {
  it('familyNotice (template usable, confirmation dropped): the teacher AND the guardian', async () => {
    const h = harness();
    await h.notices.handle(move(true), NOW);
    expect(h.queued()).toEqual([KEY('t:T1'), KEY('g:G1')]);
  });

  it('a promised family is not re-gated: the template closed since, the guardian still hears once', async () => {
    const h = harness({ approved: false });
    await h.notices.handle(move(true), NOW);
    expect(h.queued()).toEqual([KEY('t:T1'), KEY('g:G1')]);
    expect(h.repo.approved).not.toHaveBeenCalled();
  });

  it('no familyNotice (the booking confirmation went): the teacher only; the guardian keeps the bell', async () => {
    for (const choice of [false, undefined]) {
      const h = harness();
      await h.notices.handle(move(choice), NOW);
      expect(h.queued()).toEqual([KEY('t:T1')]);
      expect(h.push.notifyProfiles.mock.calls.map(([p]) => p.profileIds)).toEqual([['pT1'], ['pG1']]);
    }
  });

  it('no familyNotice and the template not approved: nothing queued (the teacher is gated too)', async () => {
    const h = harness({ approved: false });
    await h.notices.handle(move(false), NOW);
    expect(h.repo.queue).not.toHaveBeenCalled();
  });

  it('the row switched off: the teacher gets no lesson_rescheduled', async () => {
    const h = harness({ rows: [{ key: 'lesson_rescheduled', enabled: false }] });
    await h.notices.handle(move(false), NOW);
    expect(h.repo.queue).not.toHaveBeenCalled();
  });
});

describe('ScheduleNotices: a resume names the RESUMED course', () => {
  it('the first lesson back is read on the rules the pause held', async () => {
    const h = harness();
    h.repo.pauseRules.mockResolvedValue(['R1', 'G9']);
    await h.notices.handle({ kind: 'course_resumed', pauseId: 'P1', studentId: 'S1', actorId: null }, NOW);
    expect(h.repo.nextLesson).toHaveBeenCalledWith({ studentId: 'S1', ruleIds: ['R1', 'G9'], after: NOW });
  });

  it('no lesson back on those rules (another course runs on): nobody is told', async () => {
    const h = harness();
    h.repo.pauseRules.mockResolvedValue([]);
    await h.notices.handle({ kind: 'course_resumed', pauseId: 'P1', studentId: 'S1', actorId: null }, NOW);
    expect(h.repo.queue).not.toHaveBeenCalled();
    expect(h.push.notifyProfiles).not.toHaveBeenCalled();
  });
});
