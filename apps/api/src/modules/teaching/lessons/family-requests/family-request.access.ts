import type { LessonView, UserRole } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { forbidden, notFound } from '@/common/http/errors';
import { LessonProposalRepo } from '@/modules/teaching/lessons/proposals/lesson-proposals.repo';
import { studentIdsOf } from '@/modules/teaching/lessons/store/lesson-row';
import { LessonStore } from '@/modules/teaching/lessons/store/lesson-store';
import { TeacherCancelRepo } from '@/modules/teaching/lessons/teacher-me/teacher-cancel.repo';

type Answers = (user: AuthUser, studentIds: readonly string[]) => Promise<boolean>;

/**
 * Who answers a family's «اطلب موعدًا آخر» (owner 2026-11-17): an admin any; an assistant (base
 * role sales) the families she owns, by the ownership rule's two links (who brought the student,
 * who holds the lead its family came from: TeacherCancelRepo.ownerIds, as the cancel push reads
 * it). Every other role: none.
 */
@Injectable()
export class FamilyRequestAccess {
  private readonly rules: Partial<Record<UserRole, Answers>> = {
    admin: () => Promise.resolve(true),
    sales: async (user, ids) => (await this.owners.ownerIds(ids)).includes(user.id),
  };

  constructor(
    private readonly owners: TeacherCancelRepo,
    private readonly proposals: LessonProposalRepo,
    private readonly store: LessonStore,
  ) {}

  mayAnswer(user: AuthUser, studentIds: readonly string[]): Promise<boolean> {
    const rule = user.role ? this.rules[user.role] : undefined;
    return rule ? rule(user, studentIds) : Promise.resolve(false);
  }

  /** The lessons of `lessons` whose family request this user answers. */
  async visible(user: AuthUser, lessons: readonly LessonView[]): Promise<LessonView[]> {
    const ids = (l: LessonView) => l.students.map((s) => s.id);
    const mine = await Promise.all(lessons.map((l) => this.mayAnswer(user, ids(l))));
    return lessons.filter((_, i) => mine[i]);
  }

  /** 404 request_not_found (unknown, or a teacher's proposal), 403 not_your_student. */
  async assertRequest(user: AuthUser, proposalId: string): Promise<void> {
    const proposal = await this.proposals.get(proposalId);
    if (proposal?.requested_by !== 'family') throw notFound('request_not_found');
    const lesson = await this.store.get(proposal.lesson_id);
    if (!(await this.mayAnswer(user, studentIdsOf(lesson)))) throw forbidden('not_your_student');
  }
}
