import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';
import { REPORTABLE_STATUSES } from '@/modules/reporting/reports';
import type { JoinLesson } from './join-target';
import type { PairLesson } from './legacy-path';

/** A lesson as the report bridge needs it: its current teacher and end. */
export interface LinkLesson {
  id: string;
  teacher_id: string;
  ends_at: string;
  status: JoinLesson['status'];
}

/** The pair of the old Apps Script's link, and the window of its lessons. */
interface PairQuery {
  studentId: string;
  teacherId: string;
  from: Date;
  to: Date;
}

/** Reads of the teacher's join and report links (service role; one lesson at a time). */
@Injectable()
export class LessonLinksRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The lesson with its teacher's meeting_mode; null when there is none. */
  async joinLesson(id: string): Promise<JoinLesson | null> {
    const { data, error } = await this.db
      .from('lessons')
      .select('id, teacher_id, status, ends_at, meeting_link, teacher:teachers(meeting_mode)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw dbError(error);
    if (!data) return null;
    const { teacher, ...lesson } = data;
    return { ...lesson, meeting_mode: teacher.meeting_mode };
  }

  async lesson(id: string): Promise<LinkLesson | null> {
    const { data, error } = await this.db
      .from('lessons')
      .select('id, teacher_id, ends_at, status')
      .eq('id', id)
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** The student with this code (AB-nnnn); null when none. */
  async studentByCode(code: string): Promise<string | null> {
    const { data, error } = await this.db
      .from('students')
      .select('id')
      .eq('code', code)
      .maybeSingle();
    if (error) throw dbError(error);
    return data?.id ?? null;
  }

  /** The teachers named exactly so (display_name_ar), at most two: one is the only answer used. */
  async teachersNamed(name: string): Promise<{ id: string; tz: string }[]> {
    const { data, error } = await this.db
      .from('teachers')
      .select('id, tz')
      .eq('display_name_ar', name)
      .limit(2);
    if (error) throw dbError(error);
    return data;
  }

  /** The pair's reportable lessons that start inside the window. */
  async pairLessons(q: PairQuery): Promise<PairLesson[]> {
    const { data, error } = await this.db
      .from('lessons')
      .select('id, starts_at, lesson_students!inner(student_id)')
      .eq('teacher_id', q.teacherId)
      .eq('lesson_students.student_id', q.studentId)
      .in('status', [...REPORTABLE_STATUSES])
      .gte('starts_at', q.from.toISOString())
      .lt('starts_at', q.to.toISOString());
    if (error) throw dbError(error);
    return data.map((l) => ({ id: l.id, starts_at: l.starts_at }));
  }
}
