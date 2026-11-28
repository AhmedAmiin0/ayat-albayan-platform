import type { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  CLOSED,
  CONFIG,
  EARLY,
  LESSON_ID,
  OPEN,
  queries,
  STUDENT_ID,
} from '@/modules/teaching/classroom/classroom.fakes';
import { verifyFamilyJoin } from '@/modules/teaching/classroom/family-link/family-join.token';
import { PublicJoinLimit } from '@/modules/teaching/classroom/join/join-limit';
import {
  FAMILY_SECRET,
  familyLinks,
  WEB_ORIGIN,
} from '@/modules/teaching/classroom/family-link/family-link.fakes';
import {
  admissionOf,
  moderation,
  recorder,
} from '@/modules/teaching/classroom/moderation/moderation.fakes';
import { studentLinkQueries } from '@/modules/teaching/classroom/student-link/student-link.fakes';
import type { StudentLinkRepo } from '@/modules/teaching/classroom/student-link/student-link.repo';
import { StudentLinkService } from '@/modules/teaching/classroom/student-link/student-link.service';

let q: ReturnType<typeof studentLinkQueries>;
const service = (over: { secret?: string | null; config?: typeof CONFIG | null } = {}) => {
  const config = over.config === undefined ? CONFIG : over.config;
  return new StudentLinkService(
    q as unknown as StudentLinkRepo,
    new PublicJoinLimit(),
    admissionOf({ q: queries(), mod: moderation(), rec: recorder(), config }),
    familyLinks(over.secret === undefined ? FAMILY_SECRET : over.secret),
  );
};
const input = { lessonId: LESSON_ID, studentId: STUDENT_ID, profileId: 'g-1' };
const fail = async (p: Promise<unknown>) => (await p.catch((e: unknown) => e)) as HttpException;

beforeEach(() => {
  q = studentLinkQueries();
});

describe('the family app browser link (portalRoomLink)', () => {
  it('a signed /join link of that lesson and student, until the room closes', async () => {
    const link = await service().portalRoomLink(input, OPEN);
    expect(link.expires_at).toBe('2026-10-05T19:00:00.000Z');
    const token = link.url.replace(`${WEB_ORIGIN}/join/`, '');
    expect(verifyFamilyJoin(FAMILY_SECRET, token, OPEN)).toMatchObject({
      lessonId: LESSON_ID,
      studentId: STUDENT_ID,
    });
    expect(q.lessonLinkId).not.toHaveBeenCalled();
  });

  it('is issued before the window opens too (the guest page refuses early joins)', async () => {
    expect((await service().portalRoomLink(input, EARLY)).url).toContain('/join/');
  });

  it('404 no_lesson for a lesson that is not theirs or whose room closed', async () => {
    q.lessonsAhead.mockResolvedValue([]);
    expect((await fail(service().portalRoomLink(input, CLOSED))).getResponse()).toMatchObject({
      code: 'no_lesson',
    });
  });

  it('503 without the link secret, and without LiveKit', async () => {
    const noSecret = await fail(service({ secret: null }).portalRoomLink(input, OPEN));
    expect([noSecret.getStatus(), noSecret.getResponse()]).toMatchObject([
      503,
      { code: 'family_link_not_configured' },
    ]);
    const noLivekit = await fail(service({ config: null }).portalRoomLink(input, OPEN));
    expect(noLivekit.getStatus()).toBe(503);
  });

  it('429 after the join limit of one login on one lesson', async () => {
    const svc = service();
    for (let i = 0; i < 10; i++) await svc.portalRoomLink(input, OPEN);
    expect((await fail(svc.portalRoomLink(input, OPEN))).getStatus()).toBe(429);
  });
});
