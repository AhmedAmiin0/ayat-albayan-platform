import { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ClassroomQueries } from './classroom.queries';
import { ADMIN, LESSON_ID, LINK_TOKEN, linkRow, OPEN, queries, TEACHER } from './classroom.fakes';
import { GuestJoinService } from './guest-join.service';
import { PublicJoinLimit } from './join-limit';
import { admissionOf, moderation, recorder, rolesOf } from './moderation.fakes';
import { RoomJoinService } from './room-join.service';
import { readerOf } from '../../common/settings/settings.fakes';
import { ClassroomSettings } from './classroom.settings';

let q: ReturnType<typeof queries>;
let mod: ReturnType<typeof moderation>;
const deps = () => ({ q, mod, rec: recorder() });
const staffJoin = (user = TEACHER) => new RoomJoinService(rolesOf(deps()), admissionOf(deps()), readerOf(ClassroomSettings)).join({ user, lessonId: LESSON_ID }, OPEN);
const guestJoin = () =>
  new GuestJoinService(q as unknown as ClassroomQueries, new PublicJoinLimit(), admissionOf(deps())).join(
    { linkToken: LINK_TOKEN, ip: '9.9.9.9', body: { name: 'سهيلة' } },
    OPEN,
  );
const code = async (p: Promise<unknown>) => ((await p.catch((e: HttpException) => e)) as HttpException).getResponse();

beforeEach(() => {
  q = queries();
  mod = moderation();
});

describe('a removed principal cannot come back to that lesson', () => {
  it('staff: checked by their login, 403 removed_from_room', async () => {
    mod.isBlocked.mockResolvedValue(true);
    expect(await code(staffJoin())).toMatchObject({ code: 'removed_from_room' });
    expect(mod.isBlocked).toHaveBeenCalledWith(LESSON_ID, { userId: TEACHER.id });
  });

  it('guest: checked by the link they came with, 403 removed_from_room', async () => {
    mod.isBlocked.mockResolvedValue(true);
    expect(await code(guestJoin())).toMatchObject({ code: 'removed_from_room' });
    expect(mod.isBlocked).toHaveBeenCalledWith(LESSON_ID, { joinLinkId: linkRow().id });
  });

  it('not blocked: both join and are recorded as participants', async () => {
    await staffJoin(ADMIN);
    await guestJoin();
    expect(mod.addParticipant).toHaveBeenCalledTimes(2);
  });

  it('a lesson the login has no role in is refused before any block lookup', async () => {
    await expect(staffJoin({ id: 'x', email: null, role: 'guardian' })).rejects.toBeInstanceOf(HttpException);
    expect(mod.isBlocked).not.toHaveBeenCalled();
  });
});
