import { joinLinkLessonSchema, type JoinLinkLesson } from '@ab/schedule';
import { Inject, Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { notFound } from '@/common/http/errors';
import { asResponse } from '@/common/http/returns';
import { JoinLinkResolver } from '@/modules/teaching/classroom/family-link/join-link.resolver';
import { LessonRoleService } from './lesson-role.service';

/**
 * GET /join-links/:token/lesson (staff login): the lesson behind a family's link /join/<token>
 * (a random link token or the family app's signed one). A teacher or admin who opens that link
 * while signed in enters /classroom/<lesson> with their own role (board pen, screen share) instead
 * of as a guest. 404 link_invalid, 403 not their lesson.
 */
@Injectable()
export class JoinLinkStaffService {
  constructor(
    @Inject(JoinLinkResolver) private readonly links: JoinLinkResolver,
    private readonly roles: LessonRoleService,
  ) {}

  async lessonOf(
    input: { user: AuthUser; token: string },
    now = new Date(),
  ): Promise<JoinLinkLesson> {
    const link = await this.links.resolve(input.token, now);
    if (!link) throw notFound('link_invalid');
    const { lesson } = await this.roles.resolve(input.user, link.lesson_id);
    return asResponse(joinLinkLessonSchema, { lessonId: lesson.id });
  }
}
