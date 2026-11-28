import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { TeachersRepo } from '@/modules/people/teachers';
import { LessonFilesAccess } from './lesson-files.access';
import {
  ADMIN,
  GUARDIAN,
  LESSON,
  lessonRef,
  OTHER_TEACHER,
  TEACHER,
  teachersFake,
} from './lesson-files.fakes';
import type { LessonFilesRepo } from './lesson-files.repo';

const access = (lesson = lessonRef() as ReturnType<typeof lessonRef> | null) => {
  const files = { lesson: vi.fn().mockResolvedValue(lesson) };
  const teachers = teachersFake() as unknown as TeachersRepo;
  return new LessonFilesAccess(files as unknown as LessonFilesRepo, teachers);
};

describe('LessonFilesAccess', () => {
  it('lets the admin and the lesson’s own teacher in', async () => {
    expect((await access().lesson(ADMIN, LESSON)).id).toBe(LESSON);
    expect((await access().lesson(TEACHER, LESSON)).id).toBe(LESSON);
  });

  it('refuses another teacher and a family login', async () => {
    await expect(access().lesson(OTHER_TEACHER, LESSON)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(access().lesson(GUARDIAN, LESSON)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('answers 404 for an unknown lesson', async () => {
    await expect(access(null).lesson(ADMIN, LESSON)).rejects.toBeInstanceOf(NotFoundException);
  });
});
