import type { UserRole } from '@ab/catalog';
import type { LessonView } from '@ab/schedule';
import { Inject, Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { forbidden, notFound } from '@/common/http/errors';
import { LessonProposalRepo } from '@/modules/teaching/lessons/proposals/lesson-proposals.repo';
import { studentIdsOf } from '@/modules/teaching/lessons/store/lesson-row';
import { LessonStore } from '@/modules/teaching/lessons/store/lesson-store';
import { TeacherCancelRepo } from '@/modules/teaching/lessons/teacher-me/teacher-cancel.repo';

/** For each lesson's students: does this user answer its family request? */
type Answers = (user: AuthUser, lessons: readonly (readonly string[])[]) => Promise<boolean[]>;

/** Her own lesson: every student on it is hers (a family request is one student's lesson). */
const ownsAll = (owners: ReadonlyMap<string, string[]>, user: AuthUser) =>
  (ids: readonly string[]): boolean =>
    ids.length > 0 && ids.every((id) => owners.get(id)?.includes(user.id) ?? false);

/** Family requests: an admin answers any, a sales assistant only her own students' lessons. */
@Injectable()
export class FamilyRequestAccess {
  private readonly rules: Partial<Record<UserRole, Answers>> = {
    admin: (_, lessons) => Promise.resolve(lessons.map(() => true)),
    sales: async (user, lessons) => {
      const owners = await this.owners.ownersOf(lessons.flat());
      return lessons.map(ownsAll(owners, user));
    },
  };
  constructor(
    @Inject(TeacherCancelRepo) private readonly owners: TeacherCancelRepo,
    @Inject(LessonProposalRepo) private readonly proposals: LessonProposalRepo,
    @Inject(LessonStore) private readonly store: LessonStore,
  ) {}
  async mayAnswer(user: AuthUser, studentIds: readonly string[]): Promise<boolean> {
    const [answers] = await this.answers(user, [studentIds]);
    return answers ?? false;
  }
  /** The lessons of `lessons` whose family request this user answers. */
  async visible(user: AuthUser, lessons: readonly LessonView[]): Promise<LessonView[]> {
    const mine = await this.answers(user, lessons.map((l) => l.students.map((s) => s.id)));
    return lessons.filter((_, i) => mine[i]);
  }
  /** 404 request_not_found (unknown, or a teacher's proposal), 403 not_your_student. */
  async assertRequest(user: AuthUser, proposalId: string): Promise<void> {
    const proposal = await this.proposals.get(proposalId);
    if (proposal?.requested_by !== 'family') throw notFound('request_not_found');
    const lesson = await this.store.get(proposal.lesson_id);
    if (!(await this.mayAnswer(user, studentIdsOf(lesson)))) throw forbidden('not_your_student');
  }
  private answers(user: AuthUser, lessons: readonly (readonly string[])[]): Promise<boolean[]> {
    const rule = user.role ? this.rules[user.role] : undefined;
    return rule ? rule(user, lessons) : Promise.resolve(lessons.map(() => false));
  }
}
