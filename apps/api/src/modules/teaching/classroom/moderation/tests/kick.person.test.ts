import { beforeEach, describe, expect, it } from 'vitest';
import { ADMIN, CONFIG, LESSON_ID, queries } from '@/modules/teaching/classroom/classroom.fakes';
import { LivekitApi } from '@/modules/teaching/classroom/livekit/livekit-api';
import { sentBody } from '@/modules/teaching/classroom/livekit/tests/livekit.fakes';
import { KickService } from '@/modules/teaching/classroom/moderation/kick.service';
import { http, moderation, participantRow, roomPersons, rolesOf } from '@/modules/teaching/classroom/moderation/moderation.fakes';
import type { ModerationRepo } from '@/modules/teaching/classroom/moderation/moderation.repo';
import type { RoomPersonRepo } from '@/modules/teaching/classroom/moderation/room-person.repo';

// Regression: removal once blocked only one link row and one identity.

const LINK = participantRow().join_link_id ?? '';
const WHATSAPP_LINK = '00000000-0000-4000-8000-0000000000f2';
let mod: ReturnType<typeof moderation>;
let h: ReturnType<typeof http>;
let persons: ReturnType<typeof roomPersons>;
const kick = () =>
  new KickService(
    rolesOf({ q: queries() }),
    mod as unknown as ModerationRepo,
    new LivekitApi(CONFIG, h),
    persons as unknown as RoomPersonRepo,
  ).remove({ user: ADMIN, lessonId: LESSON_ID, identity: 'guest-0123456789ab' });
const removed = () =>
  h.mock.calls
    .filter(([url]) => url.endsWith('/RemoveParticipant'))
    .map(([, init]) => (sentBody(init) as { identity: string }).identity);

beforeEach(() => {
  mod = moderation();
  h = http();
  persons = roomPersons();
});

describe('«إخراج» keeps the person out', () => {
  it('blocks every link of theirs in the lesson (the family link and the WhatsApp one)', async () => {
    persons.principalsOf.mockResolvedValue([{ joinLinkId: LINK }, { joinLinkId: WHATSAPP_LINK }]);
    await kick();
    expect(persons.principalsOf).toHaveBeenCalledWith(LESSON_ID, { joinLinkId: LINK });
    const blocked = mod.block.mock.calls.map(
      (call) => (call[0] as { principal: unknown }).principal,
    );
    expect(blocked).toEqual([{ joinLinkId: LINK }, { joinLinkId: WHATSAPP_LINK }]);
  });

  it('disconnects every window they hold, the removed identity first, each once', async () => {
    persons.identitiesOf.mockResolvedValue(['guest-0123456789ab', 'guest-ffffffffffff']);
    await kick();
    expect(removed()).toEqual(['guest-0123456789ab', 'guest-ffffffffffff']);
  });

  it('revokes before removing, so a reconnecting client hears and sends nothing', async () => {
    await kick();
    const methods = h.mock.calls.map(([url]) => url.split('/').pop());
    expect(methods).toEqual(['UpdateParticipant', 'RemoveParticipant']);
  });
});
