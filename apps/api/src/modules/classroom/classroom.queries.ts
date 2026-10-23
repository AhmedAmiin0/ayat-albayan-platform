import type { Tables, TablesInsert } from '@ab/db';
import { joinWindowConfig, type JoinWindowConfig } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { ClassroomSettings } from './classroom.settings';
import { isSalesLesson } from '../sales/sales-lessons';
import { dbError } from '../teachers/http';

export type JoinLesson = Pick<Tables<'lessons'>, 'id' | 'teacher_id' | 'starts_at' | 'ends_at' | 'status' | 'room_opened_at'>;
const JOIN_COLUMNS = 'id, teacher_id, starts_at, ends_at, status, room_opened_at';
export type JoinLinkRow = Tables<'lesson_join_links'>;

/** Who the family's link goes to: the student's guardian. */
export interface SendContext {
  student: { id: string; name: string };
  guardian: { id: string; phone: string };
}

/** Reads and writes of the classroom routes (service role; the services guard). */
@Injectable()
export class ClassroomQueries {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly settings: ClassroomSettings,
  ) {}

  /** The classroom window from settings (join_opens_before_min / join_closes_after_min, cached). */
  async joinWindow(): Promise<JoinWindowConfig> {
    return joinWindowConfig(await this.settings.read());
  }

  async lesson(id: string): Promise<JoinLesson | null> {
    const { data, error } = await this.db.from('lessons').select(JOIN_COLUMNS).eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** «افتح الحلقة الآن»: stamps room_opened_at once (a second call keeps the first time). */
  async openRoom(id: string, at: string): Promise<JoinLesson | null> {
    const { error } = await this.db.from('lessons').update({ room_opened_at: at }).eq('id', id).is('room_opened_at', null);
    if (error) throw dbError(error);
    return this.lesson(id);
  }

  async teacherName(teacherId: string): Promise<string | null> {
    const { data, error } = await this.db.from('teachers').select('display_name_ar').eq('id', teacherId).maybeSingle();
    if (error) throw dbError(error);
    return data?.display_name_ar ?? null;
  }

  async profileName(profileId: string): Promise<string | null> {
    const { data, error } = await this.db.from('profiles').select('full_name').eq('id', profileId).maybeSingle();
    if (error) throw dbError(error);
    return data?.full_name ?? null;
  }

  /** Is the lesson one of an assigned student of this assistant? */
  async assistsLesson(profileId: string, lessonId: string): Promise<boolean> {
    const mine = await this.db.from('student_assistants').select('student_id').eq('profile_id', profileId);
    if (mine.error) throw dbError(mine.error);
    const ids = mine.data.map((r) => r.student_id);
    if (!ids.length) return false;
    const { data, error } = await this.db
      .from('lesson_students')
      .select('student_id')
      .eq('lesson_id', lessonId)
      .in('student_id', ids)
      .limit(1);
    if (error) throw dbError(error);
    return data.length > 0;
  }

  /** Is the lesson in this salesperson's scope: booked from one of their leads, or a trial of one of their students? */
  salesOwnsLesson(profileId: string, lessonId: string): Promise<boolean> {
    return isSalesLesson(this.db, { profileId, lessonId });
  }

  /** null when the student is not on the lesson or has no guardian phone. */
  async sendContext(lessonId: string, studentId: string): Promise<SendContext | null> {
    const on = await this.db.from('lesson_students').select('student_id').match({ lesson_id: lessonId, student_id: studentId }).maybeSingle();
    if (on.error) throw dbError(on.error);
    if (!on.data) return null;
    const student = await this.db.from('students').select('id, name, guardian_id').eq('id', studentId).maybeSingle();
    if (student.error) throw dbError(student.error);
    if (!student.data) return null;
    const g = await this.db.from('guardians').select('id, phone_e164').eq('id', student.data.guardian_id).maybeSingle();
    if (g.error) throw dbError(g.error);
    if (!g.data?.phone_e164) return null;
    return { student: { id: student.data.id, name: student.data.name }, guardian: { id: g.data.id, phone: g.data.phone_e164 } };
  }

  async insertLink(row: TablesInsert<'lesson_join_links'>): Promise<JoinLinkRow> {
    const { data, error } = await this.db.from('lesson_join_links').insert(row).select('*').single();
    if (error) throw dbError(error);
    return data;
  }

  async linkByHash(hash: string): Promise<JoinLinkRow | null> {
    const { data, error } = await this.db.from('lesson_join_links').select('*').eq('token_hash', hash).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }
}
