// Test fixtures for the schedule-change notices (test-only, excluded from the build by *.fakes.ts).
import type { NotificationRuleRow } from '@ab/shared';
import { vi } from 'vitest';
import { LessonEvents } from '@/common/infra/events/lesson-events';
import type { PushService, PushTarget } from '@/common/push/push.service';
import { NotificationPolicy, type RulesReader } from '@/modules/messaging/notification-rules';
import type { MessageSender } from '@/modules/messaging/whatsapp';
import { FamilyMoveNotice } from './family-move';
import type { NoticeLessonRow, TakenLessonRow } from './notice.build';
import { NoticeGate } from './notice.gate';
import type { ScheduleNoticesRepo } from './schedule-notices.repo';
import { NoticeDeps, ScheduleNotices } from './schedule-notices.service';
import type { Notice, NoticeGuardian, NoticeStudent, NoticeTeacher } from './notice.types';

export const NOW = new Date('2026-11-01T06:00:00Z');
/** Monday 2 November 08:00 UTC: 11:00 in Riyadh, 08:00 in London. */
export const AT = new Date('2026-11-02T08:00:00Z');
/** Sunday 1 November 15:00 UTC: 18:00 in Riyadh. */
export const FROM = new Date('2026-11-01T15:00:00Z');

export const teacher = (over: Partial<NoticeTeacher> = {}): NoticeTeacher => ({
  id: 'T1',
  profile_id: 'pT1',
  phone_e164: '+966500000001',
  tz: 'Asia/Riyadh',
  display_name_ar: 'أ. فاطمة',
  status: 'active',
  profile: { disabled_at: null },
  ...over,
});

export const guardian = (over: Partial<NoticeGuardian> = {}): NoticeGuardian => ({
  id: 'G1',
  name: 'أم سهيلة',
  phone_e164: '+447700900001',
  tz: 'Europe/London',
  profile_id: 'pG1',
  ...over,
});

export const student = (over: Partial<NoticeStudent> = {}): NoticeStudent => ({
  id: 'S1',
  name: 'سهيلة',
  tz: 'Europe/London',
  profile_id: null,
  guardian: guardian(),
  ...over,
});

export const notice = (over: Partial<Notice> = {}): Notice => ({
  key: 'lesson_cancelled',
  subject: 'L1',
  lessonId: 'L1',
  at: AT,
  teachers: [{ teacher: teacher(), at: AT }],
  students: [student()],
  familyWhatsApp: true,
  actorId: 'pADMIN',
  ...over,
});

export const lessonRow = (over: Partial<NoticeLessonRow> = {}): NoticeLessonRow => ({
  id: 'L1',
  starts_at: AT.toISOString(),
  teacher: teacher(),
  lesson_students: [{ student: student() }],
  ...over,
});

/**
 * A real FamilyMoveNotice over a switchable gate: `usable` = lesson_rescheduled's row on and its
 * template approved. Default false: the booking confirmation stays (the fallback).
 */
export function fakeFamilyMove(usable = false) {
  const gate = { open: usable, usable: async () => gate.open };
  return { gate, move: new FamilyMoveNotice(gate as unknown as NoticeGate) };
}

/** A policy over stored rows (legacy mode: these keys have no legacy switch, the row decides). */
function policy(rows: Partial<NotificationRuleRow>[] = []): NotificationPolicy {
  const map = new Map(rows.map((r) => [r.key ?? '', { channels: null, timing: null, number_id: null, ...r }]));
  const reader = { snapshot: async () => ({ mode: 'legacy', rows: map, settings: {} }) };
  return new NotificationPolicy(reader as unknown as RulesReader);
}

export function harness(o: { rows?: Partial<NotificationRuleRow>[]; approved?: boolean } = {}) {
  const seen = new Set<string>();
  const repo = {
    lesson: vi.fn(async () => lessonRow()),
    student: vi.fn(async () => student()),
    lessons: vi.fn(async (): Promise<TakenLessonRow[]> => []),
    pauseRules: vi.fn(async () => ['R1']),
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
  const gate = new NoticeGate(policy(o.rows), repo as unknown as ScheduleNoticesRepo);
  const deps = new NoticeDeps(push as unknown as PushService, gate, sends);
  const events = new LessonEvents();
  const notices = new ScheduleNotices(repo as unknown as ScheduleNoticesRepo, deps, events);
  notices.onModuleInit();
  const queued = () => repo.queue.mock.calls.flatMap(([rows]) => rows.map((r) => r.dedup_key));
  return { repo, push, sender, events, notices, queued };
}
