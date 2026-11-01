import type { JoinLinkUrl } from '@ab/shared';
import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { notFound } from '@/common/http/errors';
import { TeachersRepo } from '@/modules/people/teachers/teachers.repo';
import { CLASSROOM_WEB_ORIGIN } from '@/modules/teaching/classroom/classroom.config';
import { ClassroomQueries } from '@/modules/teaching/classroom/classroom.queries';
import { hashLinkToken, linkExpiry, newLinkToken } from './join-link.token';

/**
 * POST /lessons/:id/join-link/url («انسخ لينك الطالب»): a fresh one-lesson guest link handed back as
 * a URL, for the admin or the lesson's own teacher to paste wherever they talk to the family. It
 * needs no WhatsApp template, so it works before Meta approves lesson_join_link. The guest page
 * itself still lets nobody in before the window opens (settings.join_opens_before_min).
 */
@Injectable()
export class JoinLinkCopyService {
  constructor(
    private readonly queries: ClassroomQueries,
    private readonly teachers: TeachersRepo,
    @Inject(CLASSROOM_WEB_ORIGIN) private readonly origin: string,
  ) {}

  async url(input: { lessonId: string; user: AuthUser }): Promise<JoinLinkUrl> {
    const lesson = await this.queries.lesson(input.lessonId);
    if (!lesson) throw notFound('lesson_not_found');
    const { user } = input;
    const own = user.role === 'teacher' && (await this.teachers.idByProfile(user.id)) === lesson.teacher_id;
    if (user.role !== 'admin' && !own) throw new ForbiddenException();
    const token = newLinkToken();
    const expires_at = linkExpiry(lesson, await this.queries.joinWindow());
    await this.queries.insertLink({ lesson_id: lesson.id, token_hash: hashLinkToken(token), expires_at, created_by: user.id });
    return { url: `${this.origin}/join/${token}`, expires_at };
  }
}
