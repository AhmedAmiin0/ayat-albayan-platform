import { isOpenLesson, type LessonStatus } from '@ab/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { familyTargets, type FamilyStudent } from '@/common/push/family-readers';
import { PushService, type PushTarget } from '@/common/push/push.service';
import { LessonLiveRepo } from './lesson-live.repo';

/** The lesson as «بدأت الحلقة» reads it. */
export interface LiveLesson {
  id: string;
  starts_at: string;
  status: LessonStatus;
  room_ended_at: string | null;
  students: readonly FamilyStudent[];
}

/**
 * «بدأت الحلقة» (lesson_live, owner 2026-11-16): one push per family login of an open lesson not
 * ended for everyone, keyed by the lesson, so only the teacher's FIRST arrival is told (rule 8);
 * data {kind, lessonId, studentId} opens the room straight in. Pure.
 */
export function lessonLivePushes(lesson: LiveLesson): PushTarget[] {
  const told = isOpenLesson(lesson.status) && lesson.room_ended_at === null;
  if (!told) return [];
  const subject = `lesson:${lesson.id}`;
  const event = { kind: 'lesson_live' as const, subject, data: { lessonId: lesson.id } };
  return familyTargets(event, { at: lesson.starts_at, students: lesson.students });
}

/** Sends it when the teacher enters the room (the LiveKit webhook). Never throws. */
@Injectable()
export class LessonLivePush {
  private readonly log = new Logger(LessonLivePush.name);

  constructor(
    @Inject(LessonLiveRepo) private readonly lessons: LessonLiveRepo,
    @Inject(PushService) private readonly push: PushService,
  ) {}

  async teacherEntered(lessonId: string): Promise<void> {
    try {
      const lesson = await this.lessons.lesson(lessonId);
      const targets = lesson ? lessonLivePushes(lesson) : [];
      for (const target of targets) await this.push.notifyProfiles(target);
    } catch (e) {
      this.log.warn(`lesson_live ${lessonId}: ${String(e)}`);
    }
  }
}
