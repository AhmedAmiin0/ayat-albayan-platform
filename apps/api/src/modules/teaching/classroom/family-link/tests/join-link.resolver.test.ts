import { describe, expect, it } from 'vitest';
import type { ClassroomRepo } from '@/modules/teaching/classroom/classroom.repo';
import {
  LESSON_ID,
  LINK_TOKEN,
  OPEN,
  queries,
  STUDENT_ID,
} from '@/modules/teaching/classroom/classroom.fakes';
import { studentLinkQueries } from '@/modules/teaching/classroom/student-link/student-link.fakes';
import type { StudentLinkRepo } from '@/modules/teaching/classroom/student-link/student-link.repo';
import { familyJoinExpiry, signFamilyJoin } from '@/modules/teaching/classroom/family-link/family-join.token';
import { FAMILY_SECRET, familyLinks } from '@/modules/teaching/classroom/family-link/family-link.fakes';
import { JoinLinkResolver, tokenKind } from '@/modules/teaching/classroom/family-link/join-link.resolver';
import { hashLinkToken } from '@/modules/teaching/classroom/join/join-link.token';

const exp = familyJoinExpiry('2026-10-05T19:00:00.000Z');
const FAMILY = signFamilyJoin(FAMILY_SECRET, { lessonId: LESSON_ID, studentId: STUDENT_ID, exp });

const resolver = (secret: string | null = FAMILY_SECRET) => {
  const q = queries();
  const students = studentLinkQueries();
  const r = new JoinLinkResolver(
    q as unknown as ClassroomRepo,
    students as unknown as StudentLinkRepo,
    familyLinks(secret),
  );
  return { r, q, students };
};

describe('the kind of a /join token, by shape alone', () => {
  it.each([
    [LINK_TOKEN, 'random'],
    [FAMILY, 'family'],
    ['short', 'none'],
    [`${FAMILY}x`, 'none'],
    ['', 'none'],
  ])('%j is %s', (token, kind) => {
    expect(tokenKind(token)).toBe(kind);
  });
});

describe('JoinLinkResolver', () => {
  it('a random token: the row of its sha256', async () => {
    const { r, q } = resolver();
    expect(await r.resolve(LINK_TOKEN, OPEN)).toMatchObject({ lesson_id: LESSON_ID });
    expect(q.linkByHash).toHaveBeenCalledWith(hashLinkToken(LINK_TOKEN));
  });

  it('a family token: the (lesson, student) row, created when missing', async () => {
    const { r, q, students } = resolver();
    expect(await r.resolve(FAMILY, OPEN)).toMatchObject({ student_id: STUDENT_ID });
    expect(q.lesson).toHaveBeenCalledWith(LESSON_ID);
    expect(students.lessonLinkId).toHaveBeenCalledWith({
      lesson: expect.objectContaining({ id: LESSON_ID }),
      studentId: STUDENT_ID,
    });
  });

  it('null, with no lookup, for a garbled token or a family token without the secret', async () => {
    const { r, q, students } = resolver(null);
    expect(await r.resolve('garbage', OPEN)).toBeNull();
    expect(await r.resolve(FAMILY, OPEN)).toBeNull();
    expect(q.linkByHash).not.toHaveBeenCalled();
    expect(q.lesson).not.toHaveBeenCalled();
    expect(students.lessonLinkId).not.toHaveBeenCalled();
  });
});
