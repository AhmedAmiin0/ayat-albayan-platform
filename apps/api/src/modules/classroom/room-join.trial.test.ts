import { beforeEach, describe, expect, it } from 'vitest';
import { fakeSettings } from '../../common/settings/settings.fakes';
import type { ClassroomQueries } from './classroom.queries';
import { CONFIG, decode, LESSON_ID, LINK_TOKEN, OPEN, queries, TEACHER } from './classroom.fakes';
import { GuestJoinService } from './guest-join.service';
import { PublicJoinLimit } from './join-limit';
import { admissionOf, moderation, recorder, rolesOf } from './moderation.fakes';
import { RoomJoinService } from './room-join.service';

// Owner, 2026-10-11: in a trial lesson the family and the teacher do not text each other in the room.
let q: ReturnType<typeof queries>;
let mod: ReturnType<typeof moderation>;
const deps = () => ({ q, mod, rec: recorder(), config: CONFIG });
const staffJoin = () =>
  new RoomJoinService(rolesOf({ q }), admissionOf(deps()), fakeSettings()).join({ user: TEACHER, lessonId: LESSON_ID }, OPEN);
const guestJoin = () =>
  new GuestJoinService(q as unknown as ClassroomQueries, new PublicJoinLimit(), admissionOf(deps())).join(
    { linkToken: LINK_TOKEN, ip: '9.9.9.9', body: { name: 'سهيلة' } },
    OPEN,
  );

beforeEach(() => {
  q = queries();
  mod = moderation();
});

describe('the join payload says whether the room has text chat', () => {
  it('a trial lesson: chat false for the staff join and the guest join', async () => {
    mod.isTrialLesson.mockResolvedValue(true);
    expect((await staffJoin()).chat).toBe(false);
    expect((await guestJoin()).chat).toBe(false);
    expect(mod.isTrialLesson).toHaveBeenCalledWith(LESSON_ID);
  });

  it('any other lesson: chat true, everything else unchanged', async () => {
    const staff = await staffJoin();
    expect(staff).toMatchObject({ chat: true, role: 'teacher', recording: 'on' });
    expect((await guestJoin()).chat).toBe(true);
  });

  it('the token still lets everyone publish data (the whiteboard and the requests ride on it)', async () => {
    mod.isTrialLesson.mockResolvedValue(true);
    expect(decode((await staffJoin()).token).video.canPublishData).toBe(true);
    expect(decode((await guestJoin()).token).video.canPublishData).toBe(true);
  });
});
