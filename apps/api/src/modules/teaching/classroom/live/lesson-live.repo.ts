import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { FAMILY_STUDENT_SELECT, type FamilyStudent } from '@/common/push/family-readers';
import { dbError } from '@/common/http/http';
import type { LiveLesson } from './lesson-live.push';

const STUDENT = FAMILY_STUDENT_SELECT;
const LESSON = `id, starts_at, status, room_ended_at, lesson_students(student:students(${STUDENT}))`;

const present = (s: { student: FamilyStudent | null }): FamilyStudent[] =>
  s.student ? [s.student] : [];

/** The lesson and its students with their family logins (service role). */
@Injectable()
export class LessonLiveRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async lesson(lessonId: string): Promise<LiveLesson | null> {
    const { data, error } = await this.db
      .from('lessons')
      .select(LESSON)
      .eq('id', lessonId)
      .maybeSingle();
    if (error) throw dbError(error);
    if (!data) return null;
    const { lesson_students: links, ...lesson } = data;
    return { ...lesson, students: links.flatMap(present) };
  }
}
