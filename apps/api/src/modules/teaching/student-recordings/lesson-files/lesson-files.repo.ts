import type { Tables, TablesInsert } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';

export type LessonFileRow = Tables<'lesson_files'>;
export type LessonRef = Pick<Tables<'lessons'>, 'id' | 'teacher_id' | 'starts_at' | 'ends_at'>;

/** lesson_files (service role; the services decide who may ask, rule 9). */
@Injectable()
export class LessonFilesRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async lesson(id: string): Promise<LessonRef | null> {
    const { data, error } = await this.db
      .from('lessons')
      .select('id, teacher_id, starts_at, ends_at')
      .eq('id', id)
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** The lesson's files, newest first; `familyOnly` keeps the ones shown to the family. */
  async ofLesson(input: { lessonId: string; familyOnly: boolean }): Promise<LessonFileRow[]> {
    let q = this.db.from('lesson_files').select('*').eq('lesson_id', input.lessonId);
    if (input.familyOnly) q = q.eq('visible_to_family', true);
    const { data, error } = await q.order('created_at', { ascending: false });
    if (error) throw dbError(error);
    return data;
  }

  async byId(id: string): Promise<LessonFileRow | null> {
    const { data, error } = await this.db.from('lesson_files').select('*').eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  async add(row: TablesInsert<'lesson_files'>): Promise<LessonFileRow> {
    const { data, error } = await this.db.from('lesson_files').insert(row).select('*').single();
    if (error) throw dbError(error);
    return data;
  }

  async setVisible(id: string, visible: boolean): Promise<LessonFileRow> {
    const { data, error } = await this.db
      .from('lesson_files')
      .update({ visible_to_family: visible })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw dbError(error);
    return data;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.db.from('lesson_files').delete().eq('id', id);
    if (error) throw dbError(error);
  }
}
