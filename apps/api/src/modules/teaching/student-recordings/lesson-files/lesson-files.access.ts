import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { notFound } from '@/common/http/errors';
import { TeachersRepo } from '@/modules/people/teachers';
import { LessonFilesRepo, type LessonRef } from './lesson-files.repo';

type Gate = (user: AuthUser, lesson: LessonRef) => Promise<boolean>;

/**
 * Who may read and change a lesson's files (rule 9, the API being the gate): any admin, and the
 * lesson's own teacher. Nobody else; the family reads through /portal.
 */
@Injectable()
export class LessonFilesAccess {
  private readonly gates: Readonly<Record<string, Gate>> = {
    admin: () => Promise.resolve(true),
    teacher: async (user, lesson) =>
      (await this.teachers.idByProfile(user.id)) === lesson.teacher_id,
  };

  constructor(
    @Inject(LessonFilesRepo) private readonly files: LessonFilesRepo,
    @Inject(TeachersRepo) private readonly teachers: TeachersRepo,
  ) {}

  /** 404 lesson_not_found, 403 for anyone but the admin and the lesson's teacher. */
  async lesson(user: AuthUser, lessonId: string): Promise<LessonRef> {
    const lesson = await this.files.lesson(lessonId);
    if (!lesson) throw notFound('lesson_not_found');
    const gate = this.gates[user.role ?? ''] ?? (() => Promise.resolve(false));
    const may = await gate(user, lesson);
    if (!may) throw new ForbiddenException();
    return lesson;
  }
}
