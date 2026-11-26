import type { StudentRecordingsQuery } from '@ab/schedule';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { maybe, pgError } from '@/common/db/errors';
import type { SortSpec } from '@/common/db/list-sort';
import { readPage } from '@/common/db/page';
import { dayBounds, type RecordingJoinRow } from './student-recordings.mapper';

const SELECT =
  '*, lessons!inner(starts_at, teacher_id, teachers(id, display_name_ar, display_name_en), lesson_students!inner(student_id))';

const RECORDING_ORDER: SortSpec<never> = {
  columns: {},
  fallback: [
    { column: 'started_at', ascending: false },
    { column: 'id', ascending: false },
  ],
};

interface RecordingsPageInput {
  studentId: string;
  /** Only lessons this teacher taught (a teacher who does not have the student assigned); null = all. */
  onlyTeacherId: string | null;
  query: StudentRecordingsQuery;
}

/** The equality filters of a page that are set: the teacher scope, the teacher, the state. */
function pageFilters(input: RecordingsPageInput): [string, string][] {
  const all: [string, string | null | undefined][] = [
    ['lessons.teacher_id', input.onlyTeacherId],
    ['lessons.teacher_id', input.query.teacherId],
    ['status', input.query.status],
  ];
  return all.flatMap(([column, value]) => (value ? [[column, value]] : []));
}

/** The student file's recordings (service role; the services guard who may ask). */
@Injectable()
export class StudentRecordingRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async student(id: string): Promise<{ id: string; teacher_id: string | null } | null> {
    const data = maybe(await this.db.from('students').select('id, teacher_id').eq('id', id).maybeSingle());
    return data;
  }

  /** Has this teacher taught a lesson this student attended? */
  async taughtBy(input: { teacherId: string; studentId: string }): Promise<boolean> {
    const { data, error } = await this.db
      .from('lesson_students')
      .select('lesson_id, lessons!inner(teacher_id)')
      .eq('student_id', input.studentId)
      .eq('lessons.teacher_id', input.teacherId)
      .limit(1);
    if (error) throw pgError(error);
    return data.length > 0;
  }

  async assists(input: { profileId: string; studentId: string }): Promise<boolean> {
    const data = maybe(await this.db
      .from('student_assistants')
      .select('student_id')
      .eq('profile_id', input.profileId)
      .eq('student_id', input.studentId)
      .maybeSingle());
    return data !== null;
  }

  /** The lessons of this student with a finished recording: ids only, nothing is signed (the report history's links). */
  async doneLessonIds(input: { studentId: string; onlyTeacherId: string | null }): Promise<string[]> {
    let q = this.db
      .from('lesson_recordings')
      .select('lesson_id, lessons!inner(teacher_id, lesson_students!inner(student_id))')
      .eq('lessons.lesson_students.student_id', input.studentId)
      .eq('status', 'done');
    if (input.onlyTeacherId) q = q.eq('lessons.teacher_id', input.onlyTeacherId);
    const { data, error } = await q.limit(1000);
    if (error) throw pgError(error);
    return [...new Set(data.flatMap((r) => (r.lesson_id ? [r.lesson_id] : [])))];
  }

  /**
   * One page of the student's recordings, newest first. A group lesson's recording matches each
   * attending student: the join runs through lesson_students for THIS student only.
   */
  async page(input: RecordingsPageInput): Promise<{ rows: RecordingJoinRow[]; total: number }> {
    const { query } = input;
    const { gte, lt } = dayBounds(query);
    const read = () => {
      let q = this.db
        .from('lesson_recordings')
        .select(SELECT, { count: 'exact' })
        .eq('lessons.lesson_students.student_id', input.studentId);
      for (const [column, value] of pageFilters(input)) q = q.eq(column, value);
      if (gte) q = q.gte('lessons.starts_at', gte);
      return lt ? q.lt('lessons.starts_at', lt) : q;
    };
    return readPage(read, query, RECORDING_ORDER);
  }
}
