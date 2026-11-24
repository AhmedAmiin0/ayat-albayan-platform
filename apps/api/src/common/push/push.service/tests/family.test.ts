import { describe, expect, it } from 'vitest';
import { fakeExpo, fakePushDb, flushPushes, pushService } from '@/common/push/push.fakes';

// The family app's pushes (docs/50 §5 item 6): guardians and student logins hold the bell now (a
// fixed portal grant); a child student never hears about money (§4); staff never get family kinds.

const T = (id: string) => `ExponentPushToken[${id}]`;
const PROFILES = [
  { id: 'g1', role: 'guardian', push_tokens: [T('g1')] },
  { id: 'kid', role: 'student', push_tokens: [T('kid')] },
  { id: 'adult', role: 'student', push_tokens: [T('adult')] },
  { id: 't1', role: 'teacher', push_tokens: [T('t1')] },
];
const STUDENTS = [
  { profile_id: 'kid', contact_is_self: false },
  { profile_id: 'adult', contact_is_self: true },
];
const IDS = PROFILES.map((p) => p.id);
const event = { subject: 'lesson:l1', vars: { student: 'سهيلة', when: 'الأحد 5:00 م' } };

type Kind = 'lesson_starting' | 'payment_received' | 'report_sent' | 'channel_message';

async function told(kind: Kind) {
  const { db, writes } = fakePushDb(PROFILES, { students: STUDENTS });
  const { transport, devices } = fakeExpo();
  await pushService(db, { transport }).notifyProfiles({ ...event, kind, profileIds: IDS });
  await flushPushes();
  const rows = writes
    .filter((w) => w.op === 'upsert')
    .map((w) => (w.value as { profile_id: string }).profile_id);
  return { rows, pushed: devices() };
}

describe('PushService: family kinds and readers', () => {
  it('lesson_starting reaches the guardian and both students, never the teacher', async () => {
    const { rows, pushed } = await told('lesson_starting');
    expect(rows).toEqual(['g1', 'kid', 'adult']);
    expect(pushed).toEqual([T('g1'), T('kid'), T('adult')]);
  });

  it('report_sent: one row per profile, keyed by kind, subject and profile (rule 8)', async () => {
    const { db, writes } = fakePushDb(PROFILES, { students: STUDENTS, dedup: true });
    const svc = pushService(db);
    const target = { ...event, kind: 'report_sent' as const, profileIds: ['g1'] };
    await svc.notifyProfiles(target);
    await svc.notifyProfiles(target);
    const keys = writes
      .filter((w) => w.op === 'upsert')
      .map((w) => (w.value as { dedup_key?: string }).dedup_key);
    // The second upsert hits the key already written: no new row, so no second push.
    expect(keys).toEqual(['report_sent:lesson:l1:g1', 'report_sent:lesson:l1:g1']);
  });

  it('a chat message (owner 2026-11-16): the guardian, both students and the teacher', async () => {
    const { rows } = await told('channel_message');
    expect(rows).toEqual(['g1', 'kid', 'adult', 't1']);
  });

  it('money news: the guardian and the adult student, never the child', async () => {
    const { rows } = await told('payment_received');
    expect(rows).toEqual(expect.arrayContaining(['g1', 'adult', 't1']));
    expect(rows).not.toContain('kid');
  });

  it('a student login with no students row reads as a child (fail closed)', async () => {
    const { db, writes } = fakePushDb(PROFILES);
    await pushService(db).notifyProfiles({
      ...event,
      kind: 'payment_received',
      profileIds: ['adult'],
    });
    expect(writes).toEqual([]);
  });
});
