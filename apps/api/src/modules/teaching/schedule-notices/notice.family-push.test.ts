import { describe, expect, it } from 'vitest';
import { fakeExpo, fakePushDb, flushPushes, pushService } from '@/common/push/push.fakes';
import { planNotice } from './notice.plan';
import { notice, NOW, student } from './schedule-notices.fakes';

// docs/50 §5 item 6: guardians and students hold notifications.push now (a fixed portal grant), so
// the familyParts bells, dropped before for lacking it, reach the family app's users.

const T = (id: string) => `ExponentPushToken[${id}]`;
const PROFILES = [
  { id: 'pT1', role: 'teacher', push_tokens: [T('t')] },
  { id: 'pG1', role: 'guardian', push_tokens: [T('g')] },
  { id: 'pS1', role: 'student', push_tokens: [T('s')] },
];

async function delivered(targets: ReturnType<typeof planNotice>['pushes']) {
  const { db } = fakePushDb(PROFILES, {
    students: [{ profile_id: 'pS1', contact_is_self: false }],
  });
  const { transport, devices } = fakeExpo();
  const push = pushService(db, { transport });
  for (const target of targets) await push.notifyProfiles(target);
  await flushPushes();
  return devices();
}

describe('schedule notices reach the family app (system permissions)', () => {
  it('a guardian with a push token gets the cancel on their device; the teacher still does', async () => {
    expect(await delivered(planNotice(notice(), NOW).pushes)).toEqual([T('t'), T('g')]);
  });

  it('a child student’s own login gets it too (a lesson kind, not money)', async () => {
    const own = student({ profile_id: 'pS1' });
    const pushes = planNotice(notice({ students: [own] }), NOW).pushes;
    expect(await delivered(pushes)).toEqual([T('t'), T('g'), T('s')]);
  });
});
