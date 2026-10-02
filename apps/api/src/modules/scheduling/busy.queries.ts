import { OCCUPYING_LESSON_STATUSES } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import type { BusyLesson, StudentBusyLesson } from './conflicts';
import type { UtcWindow } from './occurrences';
import { readAll } from './read-all';

const occupying = [...OCCUPYING_LESSON_STATUSES];

/** Occupying lessons overlapping a span, the input of findConflicts (R-SCH-04, issue B3). */
@Injectable()
export class BusyQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async teacherLessons(teacherId: string, span: UtcWindow): Promise<BusyLesson[]> {
    const rows = await readAll((from, to) =>
      this.db
        .from('lessons')
        .select('id, starts_at, ends_at')
        .eq('teacher_id', teacherId)
        .in('status', occupying)
        .lt('starts_at', span.to.toISOString())
        .gt('ends_at', span.from.toISOString())
        .order('starts_at')
        .order('id')
        .range(from, to),
    );
    return rows.map((r) => ({ id: r.id, starts_at: new Date(r.starts_at), ends_at: new Date(r.ends_at) }));
  }

  /** One row per (lesson, student) for the given students. */
  async studentLessons(studentIds: readonly string[], span: UtcWindow): Promise<StudentBusyLesson[]> {
    if (studentIds.length === 0) return [];
    const rows = await readAll((from, to) =>
      this.db
        .from('lesson_students')
        .select('student_id, lessons!inner(id, starts_at, ends_at, status)')
        .in('student_id', [...studentIds])
        .in('lessons.status', occupying)
        .lt('lessons.starts_at', span.to.toISOString())
        .gt('lessons.ends_at', span.from.toISOString())
        .order('lesson_id')
        .order('student_id')
        .range(from, to),
    );
    return rows.map((r) => ({
      id: r.lessons.id,
      student_id: r.student_id,
      starts_at: new Date(r.lessons.starts_at),
      ends_at: new Date(r.lessons.ends_at),
    }));
  }
}
