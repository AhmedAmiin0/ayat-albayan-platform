import { describe, expect, it } from 'vitest';
import type { ScheduleChange } from '@/common/events/lesson-events';
import type { TakenLessonRow } from './notice.build';
import { FROM, harness, lessonRow, NOW, teacher } from './schedule-notices.fakes';

const CANCEL: ScheduleChange = { kind: 'lesson_cancelled', lessonId: 'L1', actorId: 'pADMIN' };

describe('ScheduleNotices: gates', () => {
  it('rule on (default) and template approved: bells, then both WhatsApp rows, then the sender is kicked', async () => {
    const h = harness();
    await h.notices.handle(CANCEL, NOW);
    expect(h.push.notifyProfiles.mock.calls.map(([p]) => p.profileIds)).toEqual([['pT1'], ['pG1']]);
    expect(h.queued()).toEqual(['lesson_cancelled:L1:t:T1', 'lesson_cancelled:L1:g:G1']);
    expect(h.repo.approved).toHaveBeenCalledWith('lesson_cancelled');
    expect(h.sender.kick).toHaveBeenCalledTimes(1);
  });

  it('the row switched off: no WhatsApp (PushService applies the same rule to the bells)', async () => {
    const h = harness({ rows: [{ key: 'lesson_cancelled', enabled: false }] });
    await h.notices.handle(CANCEL, NOW);
    expect(h.repo.queue).not.toHaveBeenCalled();
    expect(h.sender.kick).not.toHaveBeenCalled();
  });

  it('another row switched off does not hold this one', async () => {
    const h = harness({ rows: [{ key: 'course_paused', enabled: false }] });
    await h.notices.handle(CANCEL, NOW);
    expect(h.queued()).toHaveLength(2);
  });

  it('template not approved yet: nothing queued, never a free-text fallback', async () => {
    const h = harness({ approved: false });
    await h.notices.handle(CANCEL, NOW);
    expect(h.repo.queue).not.toHaveBeenCalled();
    expect(h.push.notifyProfiles).toHaveBeenCalledTimes(2);
  });

  it('a past lesson: nobody, nothing read beyond the lesson', async () => {
    const h = harness();
    h.repo.lesson.mockResolvedValue(lessonRow({ starts_at: '2026-10-31T08:00:00Z' }));
    await h.notices.handle(CANCEL, NOW);
    expect(h.push.notifyProfiles).not.toHaveBeenCalled();
    expect(h.repo.approved).not.toHaveBeenCalled();
  });

  it('never throws: a failed read is logged, the change is already saved', async () => {
    const h = harness();
    h.repo.lesson.mockRejectedValue(new Error('db down'));
    await expect(h.events.scheduleChanged(CANCEL)).resolves.toBeUndefined();
  });
});

describe('ScheduleNotices: idempotent, one notice per pause', () => {
  it('a double tap (the same change twice) queues each row once and kicks once', async () => {
    const h = harness();
    await h.notices.handle(CANCEL, NOW);
    await h.notices.handle(CANCEL, NOW);
    expect(new Set(h.queued()).size).toBe(2);
    expect(h.sender.kick).toHaveBeenCalledTimes(1);
  });

  it('a pause that took three lessons sends ONE course_paused per recipient, no lesson_cancelled', async () => {
    const h = harness();
    const at = (d: string, id: string): TakenLessonRow =>
      ({ id, starts_at: d, teacher: teacher() });
    h.repo.lessons.mockResolvedValue([at('2026-11-02T08:00:00Z', 'a'), at('2026-11-04T08:00:00Z', 'b'), at('2026-11-06T08:00:00Z', 'c')]);
    await h.notices.handle({ kind: 'course_paused', pauseId: 'P1', studentId: 'S1', lessonIds: ['a', 'b', 'c'], actorId: 'pS' }, NOW);
    expect(h.queued()).toEqual(['course_paused:P1:t:T1', 'course_paused:P1:g:G1']);
    expect(h.repo.lessons).toHaveBeenCalledWith(['a', 'b', 'c']);
  });

  it('a resume names the first lesson back, read after the lessons are booked again', async () => {
    const h = harness();
    h.repo.nextLesson.mockResolvedValue({ id: 'n1', starts_at: '2026-11-03T08:00:00Z', teacher: teacher() });
    await h.notices.handle({ kind: 'course_resumed', pauseId: 'P1', studentId: 'S1', actorId: null }, NOW);
    expect(h.repo.pauseRules).toHaveBeenCalledWith('P1');
    expect(h.repo.nextLesson).toHaveBeenCalledWith({ studentId: 'S1', ruleIds: ['R1'], after: NOW });
    expect(h.queued()).toEqual(['course_resumed:P1:t:T1', 'course_resumed:P1:g:G1']);
  });

  it('a move: one notice per new start; moving it again is a new notice', async () => {
    const h = harness();
    const move = { kind: 'lesson_rescheduled', lessonId: 'L1', fromStartsAt: FROM.toISOString(), actorId: null, familyNotice: true } as const;
    await h.notices.handle(move, NOW);
    h.repo.lesson.mockResolvedValue(lessonRow({ starts_at: '2026-11-03T08:00:00Z' }));
    await h.notices.handle(move, NOW);
    expect(h.queued()).toHaveLength(4);
  });
});
