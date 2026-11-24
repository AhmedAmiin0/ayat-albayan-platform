import type { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { CONFIG, EARLY, LESSON_ID, queries, STUDENT_ID } from '@/modules/teaching/classroom/classroom.fakes';
import { familyLinks, FAMILY_SECRET } from '@/modules/teaching/classroom/family-link/family-link.fakes';
import { PublicJoinLimit } from '@/modules/teaching/classroom/join/join-limit';
import { admissionOf, moderation, recorder } from '@/modules/teaching/classroom/moderation/moderation.fakes';
import { studentLinkQueries } from './student-link.fakes';
import type { StudentLinkRepo } from './student-link.repo';
import { StudentLinkService } from './student-link.service';

// docs/56: the window is skipped only for a test login on a test student; rate limit by login flag.

let q: ReturnType<typeof studentLinkQueries>;
const service = () =>
  new StudentLinkService(
    q as unknown as StudentLinkRepo,
    new PublicJoinLimit(),
    admissionOf({ q: queries(), mod: moderation(), rec: recorder(), config: CONFIG }),
    familyLinks(FAMILY_SECRET),
  );
const input = (userIsTest: boolean) => ({ lessonId: LESSON_ID, studentId: STUDENT_ID, profileId: 'g-1', userIsTest });
const studentIs = (isTest: boolean) =>
  q.student.mockResolvedValue({ id: STUDENT_ID, name: 'سهيلة محمد', is_test: isTest });
const codeOf = async (p: Promise<unknown>) =>
  ((await p.catch((e: unknown) => e)) as HttpException).getResponse();

beforeEach(() => {
  q = studentLinkQueries();
});

describe('portalJoin before the window (join_window)', () => {
  it('a test login on a test student enters', async () => {
    studentIs(true);
    await expect(service().portalJoin(input(true), EARLY)).resolves.toMatchObject({ role: 'guest' });
  });

  it('a test login on a real student is refused join_not_open_yet', async () => {
    studentIs(false);
    expect(await codeOf(service().portalJoin(input(true), EARLY))).toMatchObject({ code: 'join_not_open_yet' });
  });

  it('a real login on a test student is refused join_not_open_yet', async () => {
    studentIs(true);
    expect(await codeOf(service().portalJoin(input(false), EARLY))).toMatchObject({ code: 'join_not_open_yet' });
  });
});

describe('portalRoomLink rate limit (rate_limits)', () => {
  const outcome = (p: Promise<unknown>) =>
    p.then(() => 'ok', (e: unknown) => ((e as HttpException).getResponse() as { code: string }).code);
  const burst = async (userIsTest: boolean) => {
    const svc = service();
    const codes: string[] = [];
    const call = () => outcome(svc.portalRoomLink(input(userIsTest), EARLY));
    for (let i = 0; i < 11; i += 1) codes.push(await call());
    return codes;
  };

  it('a real login gets its 429 on the 11th link', async () => {
    expect((await burst(false)).at(-1)).toBe('too_many_requests');
  });

  it('a test login is not counted, even on a real student', async () => {
    studentIs(false);
    expect(await burst(true)).toEqual(Array.from({ length: 11 }, () => 'ok'));
  });
});
