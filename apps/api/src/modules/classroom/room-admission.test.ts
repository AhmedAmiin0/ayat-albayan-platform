import { roleOfMeta } from '@ab/shared';
import { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { CONFIG, decode, LESSON_ID, OPEN, queries } from './classroom.fakes';
import { admissionOf, moderation, recorder } from './moderation.fakes';

let mod: ReturnType<typeof moderation>;
let rec: ReturnType<typeof recorder>;
const admission = (config: typeof CONFIG | null = CONFIG) => admissionOf({ q: queries(), mod, rec, config });
const staff = { lessonId: LESSON_ID, role: 'teacher' as const, name: 'أبرار', principal: { userId: 'u1' } };
const guest = { lessonId: LESSON_ID, role: 'guest' as const, name: 'سهيلة', principal: { joinLinkId: 'l1' }, ttlSeconds: 3600 };

beforeEach(() => {
  mod = moderation();
  rec = recorder();
});

describe('RoomAdmission', () => {
  it('a blocked principal is refused 403 removed_from_room: no token, no participant row', async () => {
    mod.isBlocked.mockResolvedValue(true);
    const err = (await admission().admit(staff, OPEN).catch((e: HttpException) => e)) as HttpException;
    expect(err.getStatus()).toBe(403);
    expect(err.getResponse()).toMatchObject({ code: 'removed_from_room' });
    expect(mod.isBlocked).toHaveBeenCalledWith(LESSON_ID, { userId: 'u1' });
    expect(mod.addParticipant).not.toHaveBeenCalled();
    expect(rec.startFor).not.toHaveBeenCalled();
  });

  it('records the staff participant under the identity of the token, with the login', async () => {
    const r = await admission().admit(staff, OPEN);
    const c = decode(r.token);
    expect(mod.addParticipant).toHaveBeenCalledWith({
      lesson_id: LESSON_ID,
      identity: c.sub,
      role: 'teacher',
      name: 'أبرار',
      joined_at: OPEN.toISOString(),
      user_id: 'u1',
      join_link_id: null,
    });
    expect(roleOfMeta(c.metadata)).toBe('teacher');
  });

  it('records a guest with the link, and honours the ttl', async () => {
    const r = await admission().admit(guest, OPEN);
    expect(mod.isBlocked).toHaveBeenCalledWith(LESSON_ID, { joinLinkId: 'l1' });
    expect(mod.addParticipant).toHaveBeenCalledWith(expect.objectContaining({ role: 'guest', user_id: null, join_link_id: 'l1' }));
    expect(decode(r.token).exp).toBe(OPEN.getTime() / 1000 + 3600);
  });

  it('every join, staff or guest, makes sure the lesson is recorded and says whether it can be', async () => {
    expect((await admission().admit(staff, OPEN)).recording).toBe('on');
    expect(rec.startFor).toHaveBeenCalledWith({ kind: 'lesson', id: LESSON_ID }, OPEN);
    rec.startFor.mockClear();
    await admission().admit(guest, OPEN);
    expect(rec.startFor).toHaveBeenCalledTimes(1);
    rec.configured = false;
    expect((await admission().admit(guest, OPEN)).recording).toBe('off');
  });

  it('the join never fails on the recording', async () => {
    rec.startFor.mockRejectedValue(new Error('boom'));
    await expect(admission().admit(staff, OPEN)).resolves.toMatchObject({ role: 'teacher' });
  });

  it('503 classroom_not_configured without LiveKit', async () => {
    const err = (await admission(null).admit(staff, OPEN).catch((e: HttpException) => e)) as HttpException;
    expect(err.getStatus()).toBe(503);
  });
});
