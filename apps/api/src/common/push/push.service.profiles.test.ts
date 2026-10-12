import { describe, expect, it, vi } from 'vitest';
import { fakePushDb, fakeWeb, flushPushes, okTickets, pushService } from './push.fakes';
import type { PushTransport } from './push.service';

const STUDENT = '3f1c2a5e-8b7d-4c1e-9a2b-1d2e3f4a5b6c';
const target = {
  kind: 'new_student' as const,
  subject: 'lesson-1',
  vars: { student: 'سهيلة', when: 'الأحد 4 أكتوبر 17:00' },
  data: { lessonId: 'lesson-1', studentId: STUDENT },
  profileIds: ['t1', 't1', 'a1'],
};
const profiles = [
  { id: 't1', role: 'teacher', push_tokens: ['ExponentPushToken[t]'] },
  { id: 'a1', role: 'admin', push_tokens: [] },
];

describe('PushService.notifyProfiles (R-NOT-01, R-NOT-03)', () => {
  it('one row per distinct profile, the app push, and one web push per new row with the role’s path', async () => {
    const { db, writes } = fakePushDb(profiles);
    const transport = vi.fn<PushTransport>(async (m) => okTickets(m.length));
    const { web, send } = fakeWeb();
    await pushService(db, { transport, web }).notifyProfiles(target);
    await flushPushes();
    const rows = writes.filter((w) => w.op === 'upsert').map((w) => w.value);
    expect(rows).toEqual([
      expect.objectContaining({ profile_id: 't1', kind: 'new_student', dedup_key: 'new_student:lesson-1:t1', title: 'طالب جديد في حلقاتك' }),
      expect.objectContaining({ profile_id: 'a1', dedup_key: 'new_student:lesson-1:a1' }),
    ]);
    expect(rows[0]).toMatchObject({ body: 'سهيلة: أول حلقة الأحد 4 أكتوبر 17:00', data: { kind: 'new_student', lessonId: 'lesson-1', studentId: STUDENT } });
    expect(transport).toHaveBeenCalledTimes(1);
    expect(send.mock.calls).toEqual([
      ['t1', { title: 'طالب جديد في حلقاتك', body: 'سهيلة: أول حلقة الأحد 4 أكتوبر 17:00', url: '/teacher/calendar', tag: 'new_student:lesson-1' }],
      ['a1', expect.objectContaining({ url: `/admin/students/${STUDENT}` })],
    ]);
  });

  it('no profiles = no read at all', async () => {
    const { db } = fakePushDb(profiles);
    await pushService(db, { transport: vi.fn<PushTransport>(), web: fakeWeb().web }).notifyProfiles(
      { ...target, profileIds: [] },
    );
    expect(db.from).not.toHaveBeenCalled();
  });

  it('a failure for one profile does not stop the next', async () => {
    const { db, writes } = fakePushDb(profiles);
    const { web, send } = fakeWeb();
    send.mockRejectedValueOnce(new Error('boom'));
    await expect(
      pushService(db, { transport: vi.fn<PushTransport>(), web }).notifyProfiles(target),
    ).resolves.toBeUndefined();
    await flushPushes();
    expect(writes.filter((w) => w.op === 'upsert')).toHaveLength(2);
    expect(send).toHaveBeenCalledTimes(2);
  });
});
