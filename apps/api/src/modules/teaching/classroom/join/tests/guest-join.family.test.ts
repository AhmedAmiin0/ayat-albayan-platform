import type { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ClassroomRepo } from '@/modules/teaching/classroom/classroom.repo';
import {
  CLOSED,
  CONFIG,
  EARLY,
  LESSON,
  LESSON_ID,
  linkRow,
  OPEN,
  queries,
  STUDENT_ID,
} from '@/modules/teaching/classroom/classroom.fakes';
import { admissionOf, moderation, recorder } from '@/modules/teaching/classroom/moderation/moderation.fakes';
import { LESSON_LINK_ID, studentLinkQueries } from '@/modules/teaching/classroom/student-link/student-link.fakes';
import { familyJoinExpiry, signFamilyJoin } from '@/modules/teaching/classroom/family-link/family-join.token';
import { GuestJoinService } from '@/modules/teaching/classroom/join/guest-join.service';
import { PublicJoinLimit } from '@/modules/teaching/classroom/join/join-limit';
import { FAMILY_SECRET, resolverOf } from '@/modules/teaching/classroom/family-link/family-link.fakes';

// The family app's browser link (/join/<signed token>): the same guest join, through the
// (lesson, student) row the portal join uses.
let q: ReturnType<typeof queries>;
let students: ReturnType<typeof studentLinkQueries>;
let mod: ReturnType<typeof moderation>;
const exp = familyJoinExpiry('2026-10-05T19:00:00.000Z');
const TOKEN = signFamilyJoin(FAMILY_SECRET, { lessonId: LESSON_ID, studentId: STUDENT_ID, exp });
const join = (linkToken = TOKEN, now = OPEN) =>
  new GuestJoinService(
    q as unknown as ClassroomRepo,
    new PublicJoinLimit(),
    admissionOf({ q, mod, rec: recorder(), config: CONFIG }),
    resolverOf(q, students),
  ).join({ linkToken, ip: '9.9.9.9', body: { name: 'سهيلة' } }, now);
const fail = async (p: Promise<unknown>) => (await p.catch((e: unknown) => e)) as HttpException;

beforeEach(() => {
  q = queries();
  students = studentLinkQueries();
  mod = moderation();
});

describe('guest join with the family join token', () => {
  it('goes in by THE (lesson, student) row, never by a token hash', async () => {
    expect(await join()).toMatchObject({ role: 'guest', room: `lesson-${LESSON_ID}` });
    expect(students.lessonLinkId).toHaveBeenCalledWith({ lesson: LESSON, studentId: STUDENT_ID });
    expect(q.linkById).toHaveBeenCalledWith(LESSON_LINK_ID);
    expect(q.linkByHash).not.toHaveBeenCalled();
  });

  it('a removed student stays removed: 403 removed_from_room, checked on that row', async () => {
    mod.isBlocked.mockResolvedValue(true);
    expect((await fail(join())).getResponse()).toMatchObject({ code: 'removed_from_room' });
    expect(mod.isBlocked).toHaveBeenCalledWith(LESSON_ID, { joinLinkId: LESSON_LINK_ID });
  });

  it("keeps today's checks: early 403 join_not_open_yet, a revoked row 410 link_expired", async () => {
    expect((await fail(join(TOKEN, EARLY))).getResponse()).toMatchObject({ code: 'join_not_open_yet' });
    q.linkById.mockResolvedValueOnce(linkRow({ revoked_at: '2026-10-05T10:00:00Z' }));
    expect((await fail(join())).getResponse()).toMatchObject({ code: 'link_expired' });
  });

  it('404 link_invalid when expired, tampered, signed with another secret or its lesson is gone', async () => {
    const other = signFamilyJoin('x'.repeat(40), { lessonId: LESSON_ID, studentId: STUDENT_ID, exp });
    const flip = TOKEN.startsWith('B') ? 'C' : 'B';
    for (const bad of [other, `${flip}${TOKEN.slice(1)}`]) {
      expect((await fail(join(bad))).getResponse()).toMatchObject({ code: 'link_invalid' });
    }
    expect((await fail(join(TOKEN, CLOSED))).getResponse()).toMatchObject({ code: 'link_invalid' });
    q.lesson.mockResolvedValueOnce(null);
    expect((await fail(join())).getStatus()).toBe(404);
    expect(students.lessonLinkId).not.toHaveBeenCalled();
  });
});
