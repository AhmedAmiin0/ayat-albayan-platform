import type { Tables } from '@ab/db';
import { joinWindowConfig, OPEN_LESSON_STATUSES, type JoinWindowConfig } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { ClassroomSettings } from './classroom.settings';
import { dbError } from '../teachers/http';
import { hashLinkToken, linkExpiry, newLinkToken } from './join-link.token';

export type StudentLinkRow = Pick<Tables<'student_join_links'>, 'id' | 'student_id' | 'revoked_at'>;
export type StudentLesson = Pick<Tables<'lessons'>, 'id' | 'starts_at' | 'ends_at' | 'room_opened_at'> & {
  teacher_name: string;
};
type LessonEmbed = Pick<Tables<'lessons'>, 'id' | 'starts_at' | 'ends_at' | 'room_opened_at'> & {
  teacher: { display_name_ar: string } | null;
};

const UNIQUE_VIOLATION = '23505';
const AHEAD = 20;

/** Reads and writes of the student's long-lived link (migration 191; service role, the services guard). */
@Injectable()
export class StudentLinkQueries {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly settings: ClassroomSettings,
  ) {}

  /** The classroom window from settings (join_opens_before_min / join_closes_after_min, cached). */
  async joinWindow(): Promise<JoinWindowConfig> {
    return joinWindowConfig(await this.settings.read());
  }

  async student(id: string): Promise<{ id: string; name: string } | null> {
    const { data, error } = await this.db.from('students').select('id, name').eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** Creates the student's link, or rotates it: the new hash replaces the old one (which then dies). */
  async saveLink(input: { studentId: string; hash: string; actorId: string }): Promise<void> {
    const row = { student_id: input.studentId, token_hash: input.hash, revoked_at: null, created_by: input.actorId, created_at: new Date().toISOString() };
    const { error } = await this.db.from('student_join_links').upsert(row, { onConflict: 'student_id' });
    if (error) throw dbError(error);
  }

  async linkByHash(hash: string): Promise<StudentLinkRow | null> {
    const { data, error } = await this.db.from('student_join_links').select('id, student_id, revoked_at').eq('token_hash', hash).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** The student's open lessons whose room has not closed yet (ended at most closesAfterMin ago), by start. */
  async lessonsAhead(studentId: string, now: Date): Promise<StudentLesson[]> {
    const { closesAfterMin } = await this.joinWindow();
    const since = new Date(now.getTime() - closesAfterMin * 60_000).toISOString();
    const { data, error } = await this.db
      .from('lessons')
      .select('id, starts_at, ends_at, room_opened_at, teacher:teachers(display_name_ar), lesson_students!inner(student_id)')
      .eq('lesson_students.student_id', studentId)
      .in('status', [...OPEN_LESSON_STATUSES])
      .gte('ends_at', since)
      .order('starts_at')
      .limit(AHEAD)
      .overrideTypes<LessonEmbed[], { merge: false }>();
    if (error) throw dbError(error);
    return data.map((l) => ({
      id: l.id,
      starts_at: l.starts_at,
      ends_at: l.ends_at,
      room_opened_at: l.room_opened_at,
      teacher_name: l.teacher?.display_name_ar ?? '',
    }));
  }

  /**
   * The lesson_join_links row a student-link join goes in by: one per (lesson, student), so a removal
   * from the room (classroom_blocks.join_link_id) holds on every later join. Its token is never handed
   * out (the student's own link is the credential); it only exists because the row needs one.
   */
  async lessonLinkId(input: { lesson: StudentLesson; studentId: string }): Promise<string> {
    const found = await this.findLessonLink(input.lesson.id, input.studentId);
    if (found) return found;
    const row = {
      lesson_id: input.lesson.id,
      student_id: input.studentId,
      token_hash: hashLinkToken(newLinkToken()),
      expires_at: linkExpiry(input.lesson, await this.joinWindow()),
    };
    const { data, error } = await this.db.from('lesson_join_links').insert(row).select('id').single();
    if (!error) return data.id;
    // Two joins at once: the other one created it.
    const raced = error.code === UNIQUE_VIOLATION ? await this.findLessonLink(input.lesson.id, input.studentId) : null;
    if (!raced) throw dbError(error);
    return raced;
  }

  private async findLessonLink(lessonId: string, studentId: string): Promise<string | null> {
    const { data, error } = await this.db
      .from('lesson_join_links')
      .select('id')
      .match({ lesson_id: lessonId, student_id: studentId })
      .maybeSingle();
    if (error) throw dbError(error);
    return data?.id ?? null;
  }
}
