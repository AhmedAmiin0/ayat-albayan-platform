import type { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ClassroomRepo } from '@/modules/teaching/classroom/classroom.repo';
import {
  CONFIG,
  decode,
  LESSON_ID,
  LINK_TOKEN,
  OPEN,
  queries,
  STUDENT_ID,
} from '@/modules/teaching/classroom/classroom.fakes';
import {
  familyJoinExpiry,
  signFamilyJoin,
} from '@/modules/teaching/classroom/family-link/family-join.token';
import {
  FAMILY_SECRET,
  resolverOf,
} from '@/modules/teaching/classroom/family-link/family-link.fakes';
import {
  admissionOf,
  moderation,
  recorder,
} from '@/modules/teaching/classroom/moderation/moderation.fakes';
import { studentLinkQueries } from '@/modules/teaching/classroom/student-link/student-link.fakes';
import { GuestJoinService } from '@/modules/teaching/classroom/join/guest-join.service';
import { PublicJoinLimit } from '@/modules/teaching/classroom/join/join-limit';

// Room server bugs (owner 2026-11-16): the family's signed /join link asked for a typed name.

let q: ReturnType<typeof queries>;
let students: ReturnType<typeof studentLinkQueries>;
const TOKEN = signFamilyJoin(FAMILY_SECRET, {
  lessonId: LESSON_ID,
  studentId: STUDENT_ID,
  exp: familyJoinExpiry('2026-10-05T19:00:00.000Z'),
});
const join = (linkToken: string, body: unknown) =>
  new GuestJoinService(
    q as unknown as ClassroomRepo,
    new PublicJoinLimit(),
    admissionOf({ q, mod: moderation(), rec: recorder(), config: CONFIG }),
    resolverOf(q, students),
  ).join({ linkToken, ip: '9.9.9.9', body }, OPEN);

beforeEach(() => {
  q = queries();
  students = studentLinkQueries();
});

describe("the family link enters with its student's name", () => {
  it("{} through a family token: the student's first name", async () => {
    const r = await join(TOKEN, {});
    expect(decode(r.token).name).toBe('سهيلة');
    expect(students.student).toHaveBeenCalledWith(STUDENT_ID);
  });

  it('a typed name still wins', async () => {
    expect(decode((await join(TOKEN, { name: 'أم سهيلة' })).token).name).toBe('أم سهيلة');
  });

  it('a random lesson link still needs a name (400)', async () => {
    const err = (await join(LINK_TOKEN, {}).catch((e: unknown) => e)) as HttpException;
    expect(err.getStatus()).toBe(400);
  });
});
