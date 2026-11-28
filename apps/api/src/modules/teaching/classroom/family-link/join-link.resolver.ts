import { looksLikeFamilyToken, roomNameOfStudent } from '@ab/schedule';
import { Inject, Injectable } from '@nestjs/common';
import { ClassroomRepo, type JoinLinkRow } from '@/modules/teaching/classroom/classroom.repo';
import { StudentLinkRepo } from '@/modules/teaching/classroom/student-link/student-link.repo';
import { FamilyJoinLinks } from './family-join.links';
import {
  hashLinkToken,
  looksLikeLinkToken,
} from '@/modules/teaching/classroom/join/join-link.token';

type TokenKind = 'random' | 'family' | 'none';
type Resolve = (token: string, now: Date) => Promise<JoinLinkRow | null>;

/** By shape alone: a random link token (32 chars) or a family join token (70 chars). */
const KINDS: readonly (readonly [TokenKind, (token: string) => boolean])[] = [
  ['random', looksLikeLinkToken],
  ['family', looksLikeFamilyToken],
];

export const tokenKind = (token: string): TokenKind =>
  KINDS.find(([, test]) => test(token))?.[0] ?? 'none';

/** null means unknown, garbled or expired (404 link_invalid); the row's own checks follow. */
@Injectable()
export class JoinLinkResolver {
  private readonly byKind: Record<TokenKind, Resolve> = {
    random: (token) => this.queries.linkByHash(hashLinkToken(token)),
    family: (token, now) => this.familyRow(token, now),
    none: () => Promise.resolve(null),
  };

  constructor(
    @Inject(ClassroomRepo) private readonly queries: ClassroomRepo,
    @Inject(StudentLinkRepo) private readonly students: StudentLinkRepo,
    @Inject(FamilyJoinLinks) private readonly family: FamilyJoinLinks,
  ) {}

  resolve(token: string, now: Date): Promise<JoinLinkRow | null> {
    return this.byKind[tokenKind(token)](token, now);
  }

  /** The name a family link enters with: the student's first name (≤ 30); null without one. */
  async studentName(link: Pick<JoinLinkRow, 'student_id'>): Promise<string | null> {
    const student = link.student_id ? await this.students.student(link.student_id) : null;
    return student ? roomNameOfStudent(student.name) : null;
  }

  private async familyRow(token: string, now: Date): Promise<JoinLinkRow | null> {
    const claim = this.family.verify(token, now);
    const lesson = claim && (await this.queries.lesson(claim.lessonId));
    if (!claim || !lesson) return null;
    const id = await this.students.lessonLinkId({ lesson, studentId: claim.studentId });
    return this.queries.linkById(id);
  }
}
