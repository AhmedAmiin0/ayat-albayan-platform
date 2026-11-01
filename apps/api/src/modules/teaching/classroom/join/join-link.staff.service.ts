import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { notFound } from '@/common/http/errors';
import { ClassroomRepo } from '@/modules/teaching/classroom/classroom.repo';
import { hashLinkToken, looksLikeLinkToken } from './join-link.token';
import { LessonRoleService } from './lesson-role.service';

/**
 * GET /join-links/:token/lesson (staff login): the lesson behind a family's link /join/<token>.
 * A teacher or admin who opens that link while signed in enters /classroom/<lesson> with their own
 * role (board pen, screen share) instead of as a guest. 404 link_invalid, 403 not their lesson.
 */
@Injectable()
export class JoinLinkStaffService {
  constructor(
    private readonly queries: ClassroomRepo,
    private readonly roles: LessonRoleService,
  ) {}

  async lessonOf(input: { user: AuthUser; token: string }): Promise<{ lessonId: string }> {
    if (!looksLikeLinkToken(input.token)) throw notFound('link_invalid');
    const link = await this.queries.linkByHash(hashLinkToken(input.token));
    if (!link) throw notFound('link_invalid');
    const { lesson } = await this.roles.resolve(input.user, link.lesson_id);
    return { lessonId: lesson.id };
  }
}
