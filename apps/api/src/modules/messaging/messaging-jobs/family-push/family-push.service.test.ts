import { joinWindowConfig } from '@ab/schedule';
import { describe, expect, it } from 'vitest';
import { fakeExpo, fakePushDb, flushPushes, pushService } from '@/common/push/push.fakes';
import { fakePolicy } from '@/modules/messaging/notification-rules/policy/policy.fakes';
import type { FamilyPushRepo } from './family-push.repo';
import { FamilyPushService } from './family-push.service';
import type { FamilyStudent } from '@/common/push/family-readers';
import type { FamilyLesson, SentReport } from './family-push.plan';

const NOW = new Date('2026-11-14T16:00:00Z');
const min = (m: number) => new Date(NOW.getTime() + m * 60_000).toISOString();
const WIN = joinWindowConfig({ join_opens_before_min: 15, join_closes_after_min: 120 });
const kid: FamilyStudent = {
  id: 's1',
  name: 'سهيلة أحمد',
  tz: 'Asia/Riyadh',
  profile_id: 'kid',
  guardian: { profile_id: 'g1', tz: 'Asia/Riyadh' },
};
const at = (id: string, start: number): FamilyLesson => ({
  id,
  starts_at: min(start),
  ends_at: min(start + 30),
  room_opened_at: null,
  students: [kid],
});
const REPORT: SentReport = { id: 'r1', lesson_id: 'l0', starts_at: min(-90), student: kid };
const TOKEN = 'ExponentPushToken[g1]';
const PROFILES = [
  { id: 'g1', role: 'guardian', push_tokens: [TOKEN] },
  { id: 'kid', role: 'student', push_tokens: [] },
];

function repo(lessons: FamilyLesson[], reports: SentReport[]) {
  return {
    window: async () => WIN,
    lessonsNearStart: async () => lessons,
    reportsSentSince: async () => reports,
  } as unknown as FamilyPushRepo;
}

function harness(rows: { key: string; enabled: boolean }[] = []) {
  const { db, writes } = fakePushDb(PROFILES, { dedup: true });
  const { transport, devices } = fakeExpo();
  const push = pushService(db, { transport, policy: fakePolicy({ mode: 'module', rows }) });
  const keys = () =>
    writes
      .filter((w) => w.op === 'upsert')
      .map((w) => (w.value as { dedup_key: string }).dedup_key);
  return { push, devices, keys };
}

describe('FamilyPushService.runOnce', () => {
  it('lessons whose window just opened and sent reports: the guardian and the student', async () => {
    const h = harness();
    const svc = new FamilyPushService(repo([at('l1', 10), at('l2', 40)], [REPORT]), h.push);
    expect(await svc.runOnce(NOW)).toEqual({ lessons: 1, reports: 1, targets: 4 });
    await flushPushes();
    expect(h.keys()).toEqual([
      'lesson_starting:lesson:l1:g1',
      'lesson_starting:lesson:l1:kid',
      'report_sent:report:r1:g1',
      'report_sent:report:r1:kid',
    ]);
    // A device push only where there is a live token: the guardian; the student keeps the bell row.
    expect(h.devices()).toEqual([TOKEN, TOKEN]);
  });

  it('a second pass pushes nothing new (the dedup key, rule 8)', async () => {
    const h = harness();
    const svc = new FamilyPushService(repo([at('l1', 0)], []), h.push);
    await svc.runOnce(NOW);
    await svc.runOnce(new Date(NOW.getTime() + 60_000));
    await flushPushes();
    expect(h.devices()).toEqual([TOKEN]);
  });

  it('a kind the admin turned off writes nothing', async () => {
    const h = harness([{ key: 'lesson_starting', enabled: false }]);
    const svc = new FamilyPushService(repo([at('l1', 0)], [REPORT]), h.push);
    await svc.runOnce(NOW);
    expect(h.keys().filter((k) => k.startsWith('lesson_starting'))).toEqual([]);
    expect(h.keys().filter((k) => k.startsWith('report_sent'))).toHaveLength(2);
  });
});
