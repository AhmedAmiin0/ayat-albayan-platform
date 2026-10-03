import { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { ADMIN, ASSISTANT, CONFIG, LESSON_ID, queries, TEACHER } from './classroom.fakes';
import { KickService } from './kick.service';
import { LivekitApi } from './livekit-api';
import { http, moderation, participantRow, rolesOf } from './moderation.fakes';
import type { ModerationQueries } from './moderation.queries';

let mod: ReturnType<typeof moderation>;
let h: ReturnType<typeof http>;
const service = (config: typeof CONFIG | null = CONFIG) =>
  new KickService(rolesOf({ q: queries() }), mod as unknown as ModerationQueries, new LivekitApi(config, h));
const kick = (user = ADMIN, identity = 'guest-0123456789ab', svc = service()) => svc.remove({ user, lessonId: LESSON_ID, identity });
const fail = async (p: Promise<unknown>) => (await p.catch((e: HttpException) => e)) as HttpException;

beforeEach(() => {
  mod = moderation();
  h = http();
});

describe('removing someone from the room', () => {
  it('the admin removes a guest: the link is blocked, then LiveKit disconnects the identity', async () => {
    await kick();
    expect(mod.participant).toHaveBeenCalledWith(LESSON_ID, 'guest-0123456789ab');
    expect(mod.block).toHaveBeenCalledWith({
      lessonId: LESSON_ID,
      principal: { joinLinkId: participantRow().join_link_id },
      blockedBy: ADMIN.id,
      target: { identity: 'guest-0123456789ab', role: 'guest', name: 'سهيلة' },
    });
    const [url, init] = h.mock.calls[0] ?? [];
    expect(url).toMatch(/\/twirp\/livekit\.RoomService\/RemoveParticipant$/);
    expect(JSON.parse(init?.body ?? '{}')).toEqual({ room: `lesson-${LESSON_ID}`, identity: 'guest-0123456789ab' });
  });

  it('the lesson teacher removes an assistant: their login is blocked', async () => {
    mod.participant.mockResolvedValue(participantRow({ identity: 'assistant-0123456789ab', role: 'assistant', user_id: ASSISTANT.id, join_link_id: null }));
    await kick(TEACHER, 'assistant-0123456789ab');
    expect(mod.block).toHaveBeenCalledWith(expect.objectContaining({ principal: { userId: ASSISTANT.id }, blockedBy: TEACHER.id }));
  });

  it('404 participant_not_found for an identity not in this lesson', async () => {
    mod.participant.mockResolvedValue(null);
    const err = await fail(kick());
    expect(err.getStatus()).toBe(404);
    expect(err.getResponse()).toMatchObject({ code: 'participant_not_found' });
    expect(h).not.toHaveBeenCalled();
  });

  it.each([
    { actor: TEACHER, role: 'teacher' },
    { actor: TEACHER, role: 'admin' },
    { actor: ADMIN, role: 'admin' },
    { actor: ASSISTANT, role: 'guest' },
  ] as const)('403 cannot_remove: a $actor.role may not remove a $role', async ({ actor, role }) => {
    mod.participant.mockResolvedValue(participantRow({ role, user_id: 'u', join_link_id: null }));
    const err = await fail(kick(actor));
    expect(err.getStatus()).toBe(403);
    expect(err.getResponse()).toMatchObject({ code: 'cannot_remove' });
    expect(mod.block).not.toHaveBeenCalled();
    expect(h).not.toHaveBeenCalled();
  });

  it('an unknown role in the row is never removable', async () => {
    mod.participant.mockResolvedValue(participantRow({ role: 'ghost' }));
    expect((await fail(kick())).getResponse()).toMatchObject({ code: 'cannot_remove' });
  });

  it('a participant whose login is gone is still disconnected (nothing to block)', async () => {
    mod.participant.mockResolvedValue(participantRow({ role: 'assistant', user_id: null, join_link_id: null }));
    await kick();
    expect(mod.block).not.toHaveBeenCalled();
    expect(h).toHaveBeenCalledTimes(1);
  });

  it('someone already gone from LiveKit: done (the block stays)', async () => {
    h = http({ status: 404, body: { code: 'not_found' } });
    await expect(kick()).resolves.toBeUndefined();
    expect(mod.block).toHaveBeenCalled();
  });

  it('LiveKit refusing otherwise: 502, the block stays', async () => {
    h = http({ status: 500, body: { code: 'internal' } });
    expect((await fail(kick())).getStatus()).toBe(502);
    expect(mod.block).toHaveBeenCalled();
  });

  it('503 classroom_not_configured without LiveKit', async () => {
    expect((await fail(kick(ADMIN, 'guest-0123456789ab', service(null)))).getStatus()).toBe(503);
  });

  it('403 for a login without a role in the lesson', async () => {
    expect((await fail(kick({ id: 'x', email: null, role: 'guardian' }))).getStatus()).toBe(403);
  });
});
