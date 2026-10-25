import type { AssistantView } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { dbError } from '../../common/http/http';

export interface LessonRef {
  lesson_id: string;
  student_id: string;
}

/** student_assistants and the assistant profiles (service role; the services guard). */
@Injectable()
export class AssistantsQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Every login with role = assistant, for the admin's picker. */
  async allAssistants(): Promise<AssistantView[]> {
    const { data, error } = await this.db.from('profiles').select('id, full_name').eq('role', 'assistant').order('full_name');
    if (error) throw dbError(error);
    return data.map((p) => ({ profile_id: p.id, full_name: p.full_name }));
  }

  async forStudent(studentId: string): Promise<AssistantView[]> {
    const { data, error } = await this.db.from('student_assistants').select('profile_id').eq('student_id', studentId);
    if (error) throw dbError(error);
    const ids = new Set(data.map((r) => r.profile_id));
    return (await this.allAssistants()).filter((a) => ids.has(a.profile_id));
  }

  async studentExists(studentId: string): Promise<boolean> {
    const { data, error } = await this.db.from('students').select('id').eq('id', studentId).maybeSingle();
    if (error) throw dbError(error);
    return data !== null;
  }

  async isAssistant(profileId: string): Promise<boolean> {
    const { data, error } = await this.db.from('profiles').select('id').match({ id: profileId, role: 'assistant' }).maybeSingle();
    if (error) throw dbError(error);
    return data !== null;
  }

  /** Idempotent: assigning twice is one row. */
  async assign(row: { studentId: string; profileId: string; actorId: string }): Promise<void> {
    const { error } = await this.db
      .from('student_assistants')
      .upsert({ student_id: row.studentId, profile_id: row.profileId, created_by: row.actorId }, { onConflict: 'student_id,profile_id', ignoreDuplicates: true });
    if (error) throw dbError(error);
  }

  async remove(studentId: string, profileId: string): Promise<void> {
    const { error } = await this.db.from('student_assistants').delete().match({ student_id: studentId, profile_id: profileId });
    if (error) throw dbError(error);
  }

  async studentIdsOf(profileId: string): Promise<string[]> {
    const { data, error } = await this.db.from('student_assistants').select('student_id').eq('profile_id', profileId);
    if (error) throw dbError(error);
    return data.map((r) => r.student_id);
  }

  async lessonRefs(studentIds: string[]): Promise<LessonRef[]> {
    if (!studentIds.length) return [];
    const { data, error } = await this.db.from('lesson_students').select('lesson_id, student_id').in('student_id', studentIds);
    if (error) throw dbError(error);
    return data;
  }
}
