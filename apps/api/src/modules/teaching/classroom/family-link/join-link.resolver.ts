import { Inject, Injectable } from '@nestjs/common';
import { ClassroomRepo, type JoinLinkRow } from '@/modules/teaching/classroom/classroom.repo';
import { StudentLinkRepo } from '@/modules/teaching/classroom/student-link/student-link.repo';
import { FamilyJoinLinks } from './family-join.links';
import { looksLikeFamilyToken } from './family-join.token';
import { hashLinkToken, looksLikeLinkToken } from '@/modules/teaching/classroom/join/join-link.token';

type TokenKind = 'random' | 'family' | 'none';
type Resolve = (token: string, now: Date) => Promise<JoinLinkRow | null>;

/** By shape alone: a random link token (32 chars) or a family join token (70 chars). */
const KINDS: readonly (readonly [TokenKind, (token: string) => boolean])[] = [
  ['random', looksLikeLinkToken],
  ['family', looksLikeFamilyToken],
];

export const tokenKind = (token: string): TokenKind =>
  KINDS.find(([, test]) => test(token))?.[0] ?? 'none';

/**
 * The lesson_join_links row behind /join/<token>: a random token by the sha256 stored on its row,
 * a family join token (the family app's browser link) by the (lesson, student) row the portal join
 * uses, created when missing, so «إخراج من الحلقة» holds on it too. null = unknown, garbled or
 * expired (404 link_invalid); the row's own checks (revoked, expired, window, removal) follow.
 */
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

  private async familyRow(token: string, now: Date): Promise<JoinLinkRow | null> {
    const claim = this.family.verify(token, now);
    const lesson = claim && (await this.queries.lesson(claim.lessonId));
    if (!claim || !lesson) return null;
    const id = await this.students.lessonLinkId({ lesson, studentId: claim.studentId });
    return this.queries.linkById(id);
  }
}
