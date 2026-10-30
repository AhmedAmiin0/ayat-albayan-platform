import { describe, expect, it, vi } from 'vitest';
import type { NotificationRuleRow } from '@ab/shared';
import { LessonEvents, type ScheduleChange } from '@/common/events/lesson-events';
import type { PushService, PushTarget } from '@/common/push/push.service';
import { NotificationPolicy, type RulesReader } from '@/modules/messaging/notification-rules';
import type { MessageSender } from '@/modules/messaging/whatsapp';
import type { TakenLessonRow } from './notice.build';
import { FROM, lessonRow, NOW, student, teacher } from './schedule-notices.fakes';
import type { ScheduleNoticesRepo } from './schedule-notices.repo';
import { NoticeDeps, ScheduleNotices } from './schedule-notices.service';

/** A policy over stored rows (legacy mode: these keys have no legacy switch, the row decides). */
function policy(rows: Partial<NotificationRuleRow>[] = []): NotificationPolicy {
  const map = new Map(rows.map((r) => [r.key ?? '', { channels: null, timing: null, number_id: null, ...r }]));
  const reader = { snapshot: async () => ({ mode: 'legacy', rows: map, settings: {} }) };
  return new NotificationPolicy(reader as unknown as RulesReader);
}

function harness(o: { rows?: Partial<NotificationRuleRow>[]; approved?: boolean } = {}) {
  const seen = new Set<string>();
  const repo = {
    lesson: vi.fn(async () => lessonRow()),
    student: vi.fn(async () => student()),
    lessons: vi.fn(async (): Promise<TakenLessonRow[]> => []),
    nextLesson: vi.fn(async (): Promise<TakenLessonRow | null> => null),
    approved: vi.fn(async () => o.approved ?? true),
    // insert … on conflict (dedup_key) do nothing.
    queue: vi.fn(async (rows: readonly { dedup_key: string }[]) => {
      const fresh = rows.filter((r) => !seen.has(r.dedup_key));
      fresh.forEach((r) => seen.add(r.dedup_key));
      return fresh.length;
    }),
  };
  const push = { notifyProfiles: vi.fn(async (_target: PushTarget) => undefined) };
  const sender = { kick: vi.fn(async () => undefined) };
  const sends = sender as unknown as MessageSender;
  const deps = new NoticeDeps(push as unknown as PushService, policy(o.rows), sends);
  const events = new LessonEvents();
  const notices = new ScheduleNotices(repo as unknown as ScheduleNoticesRepo, deps, events);
  notices.onModuleInit();
  const queued = () => repo.queue.mock.calls.flatMap(([rows]) => rows.map((r) => r.dedup_key));
  return { repo, push, sender, events, notices, queued };
}

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
    expect(h.repo.nextLesson).toHaveBeenCalledWith('S1', NOW);
    expect(h.queued()).toEqual(['course_resumed:P1:t:T1', 'course_resumed:P1:g:G1']);
  });

  it('a move: one notice per new start; moving it again is a new notice', async () => {
    const h = harness();
    const move = { kind: 'lesson_rescheduled', lessonId: 'L1', fromStartsAt: FROM.toISOString(), actorId: null } as const;
    await h.notices.handle(move, NOW);
    h.repo.lesson.mockResolvedValue(lessonRow({ starts_at: '2026-11-03T08:00:00Z' }));
    await h.notices.handle(move, NOW);
    expect(h.queued()).toHaveLength(4);
  });
});
