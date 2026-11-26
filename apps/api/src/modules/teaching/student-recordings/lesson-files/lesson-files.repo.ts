import type { Tables, TablesInsert } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { done, maybe, one, pgError } from '@/common/db/errors';

export type LessonFileRow = Tables<'lesson_files'>;
export type LessonRef = Pick<Tables<'lessons'>, 'id' | 'teacher_id' | 'starts_at' | 'ends_at'>;

/** A lesson as the family page reads it. */
interface FamilyLessonRef {
  id: string;
  starts_at: string;
  ends_at: string;
  teacher: { display_name_ar: string; display_name_en: string | null } | null;
}

const FAMILY_LESSON =
  'id, starts_at, ends_at, teacher:teachers(display_name_ar, display_name_en), lesson_students!inner(student_id)';

/** lesson_files (service role; the services decide who may ask, rule 9). */
@Injectable()
export class LessonFilesRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async lesson(id: string): Promise<LessonRef | null> {
    const data = maybe(await this.db
      .from('lessons')
      .select('id, teacher_id, starts_at, ends_at')
      .eq('id', id)
      .maybeSingle());
    return data;
  }

  /** The lesson when this student attended it; null otherwise (404 for the family). */
  async lessonOf(input: { studentId: string; lessonId: string }): Promise<FamilyLessonRef | null> {
    const data = maybe(await this.db
      .from('lessons')
      .select(FAMILY_LESSON)
      .eq('id', input.lessonId)
      .eq('lesson_students.student_id', input.studentId)
      .maybeSingle());
    if (!data) return null;
    return { id: data.id, starts_at: data.starts_at, ends_at: data.ends_at, teacher: data.teacher };
  }

  /** The lesson's files, newest first; `familyOnly` keeps the ones shown to the family. */
  async ofLesson(input: { lessonId: string; familyOnly: boolean }): Promise<LessonFileRow[]> {
    let q = this.db.from('lesson_files').select('*').eq('lesson_id', input.lessonId);
    if (input.familyOnly) q = q.eq('visible_to_family', true);
    const { data, error } = await q.order('created_at', { ascending: false });
    if (error) throw pgError(error);
    return data;
  }

  async byId(id: string): Promise<LessonFileRow | null> {
    const data = maybe(await this.db.from('lesson_files').select('*').eq('id', id).maybeSingle());
    return data;
  }

  /** Idempotent: a retried register of the same object returns the row it already made. */
  async add(row: TablesInsert<'lesson_files'>): Promise<LessonFileRow> {
    const data = maybe(await this.db
      .from('lesson_files')
      .upsert(row, { onConflict: 'storage_path', ignoreDuplicates: true })
      .select('*')
      .maybeSingle());
    return data ?? this.byPath(row.storage_path);
  }

  private async byPath(path: string): Promise<LessonFileRow> {
    const data = one(await this.db
      .from('lesson_files')
      .select('*')
      .eq('storage_path', path)
      .single());
    return data;
  }

  async setVisible(id: string, visible: boolean): Promise<LessonFileRow> {
    const data = one(await this.db
      .from('lesson_files')
      .update({ visible_to_family: visible })
      .eq('id', id)
      .select('*')
      .single());
    return data;
  }

  async remove(id: string): Promise<void> {
    done(await this.db.from('lesson_files').delete().eq('id', id));
  }
}
