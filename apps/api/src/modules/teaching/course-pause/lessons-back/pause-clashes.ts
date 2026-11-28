import { Injectable } from '@nestjs/common';
import { ConflictChecker, LessonWriter } from '@/modules/teaching/scheduling';
import { CoursePauseRepo } from '@/modules/teaching/course-pause/course-pause.repo';

/** What clash-checking the lessons booked back needs (max-params). */
@Injectable()
export class PauseClashes {
  constructor(
    readonly queries: CoursePauseRepo,
    readonly checker: ConflictChecker,
    readonly writer: LessonWriter,
  ) {}
}
