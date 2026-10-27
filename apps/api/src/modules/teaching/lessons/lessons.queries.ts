import { meetingModeOf, OPEN_LESSON_STATUSES, usesPlatform, type LessonStatus } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../common/db/db.module';
import { readAll } from '../scheduling/read-all';
import { dbError, type Page, type PageQuery } from '../../../common/http/http';
import type { Contact } from './status/confirmation-messages';
import { LESSON_SELECT, type LessonRow } from './store/lesson-row';
import { LessonsSettings } from './lessons.settings';

export type LessonWindow = { from: Date; to: Date; teacherId?: string };
type OpenLesson = { id: string; status: LessonStatus; starts_at: string };
/** `${lesson_id}:${student_id}` → lesson number (v_lesson_sequence). */
export type SeqMap = ReadonlyMap<string, number>;

/** Reads of lessons for the views and the write services (service role — callers guard). */
@Injectable()
export class LessonsQueries {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly settings: LessonsSettings,
  ) {}

  async get(id: string): Promise<LessonRow | null> {
    const { data, error } = await this.db.from('lessons').select(LESSON_SELECT).eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** By starts_at; ids are few (one action's lessons). */
  async byIds(ids: readonly string[]): Promise<LessonRow[]> {
    if (ids.length === 0) return [];
    const { data, error } = await this.db
      .from('lessons')
      .select(LESSON_SELECT)
      .in('id', [...ids])
      .order('starts_at')
      .order('id');
    if (error) throw dbError(error);
    return data;
  }

  /** starts_at ∈ [from, to), every status, by starts_at (docs/10 routes 1, 2, 4). */
  window(w: LessonWindow): Promise<LessonRow[]> {
    return readAll((from, to) => {
      let q = this.db
        .from('lessons')
        .select(LESSON_SELECT)
        .gte('starts_at', w.from.toISOString())
        .lt('starts_at', w.to.toISOString());
      if (w.teacherId) q = q.eq('teacher_id', w.teacherId);
      return q.order('starts_at').order('id').range(from, to);
    });
  }

  /** One student's lessons, newest first (route 5). */
  async studentPage(studentId: string, { page, pageSize }: PageQuery): Promise<Page<LessonRow>> {
    const start = (page - 1) * pageSize;
    const { data, count, error } = await this.db
      .from('lessons')
      .select('id, lesson_students!inner(student_id)', { count: 'exact' })
      .eq('lesson_students.student_id', studentId)
      .order('starts_at', { ascending: false })
      .order('id')
      .range(start, start + pageSize - 1);
    if (error) throw dbError(error);
    const order = new Map(data.map((r, i) => [r.id, i]));
    const rows = await this.byIds(data.map((r) => r.id));
    rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    return { items: rows, total: count ?? 0, page, pageSize };
  }

  /**
   * The teacher's lessons go out with our classroom: usesPlatform(teachers.meeting_mode,
   * settings.meeting_link_auto) (migration 490). true = a confirmation names no fixed link (forMessages).
   */
  async meetingLinkAuto(opts: { teacherId: string }): Promise<boolean> {
    const [auto, { data, error }] = await Promise.all([
      this.academyAuto(),
      this.db.from('teachers').select('meeting_mode').eq('id', opts.teacherId).maybeSingle(),
    ]);
    if (error) throw dbError(error);
    return usesPlatform(meetingModeOf(data?.meeting_mode), auto);
  }

  /** settings.meeting_link_auto: the default for a teacher whose meeting_mode is null. */
  async academyAuto(): Promise<boolean> {
    return (await this.settings.read()).meeting_link_auto;
  }

  /** Each student's name + guardian, for the queued confirmation (docs/10 §5.11). */
  async contacts(studentIds: readonly string[]): Promise<Contact[]> {
    if (studentIds.length === 0) return [];
    const { data, error } = await this.db
      .from('students')
      .select('id, name, guardian:guardians(id, phone_e164, tz)')
      .in('id', [...studentIds]);
    if (error) throw dbError(error);
    return data;
  }

  async studentExists(id: string): Promise<boolean> {
    const { data, error } = await this.db.from('students').select('id').eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    return data !== null;
  }

  /** Open (scheduled / confirmed) lessons of a rule starting at or after `cutoff`. */
  async openOfRule(ruleId: string, cutoff: Date): Promise<OpenLesson[]> {
    return readAll((from, to) =>
      this.db
        .from('lessons')
        .select('id, status, starts_at')
        .eq('rule_id', ruleId)
        .in('status', [...OPEN_LESSON_STATUSES])
        .gte('starts_at', cutoff.toISOString())
        .order('starts_at')
        .order('id')
        .range(from, to),
    );
  }

  /**
   * Lesson numbers (R-LES-03) for completed lessons, in chunks so the URL stays short; the chunks are
   * read in parallel (one round trip, not one per 100 lessons).
   * TODO(R-LES-03): v_lesson_sequence counts `completed` only; owner to confirm whether `late` counts.
   */
  async seq(lessonIds: readonly string[]): Promise<SeqMap> {
    const out = new Map<string, number>();
    const chunks = Array.from({ length: Math.ceil(lessonIds.length / SEQ_CHUNK) }, (_, i) => lessonIds.slice(i * SEQ_CHUNK, (i + 1) * SEQ_CHUNK));
    const reads = await Promise.all(chunks.map((ids) => this.db.from('v_lesson_sequence').select('lesson_id, student_id, seq').in('lesson_id', ids)));
    for (const { data, error } of reads) {
      if (error) throw dbError(error);
      for (const r of data) {
        if (r.lesson_id && r.student_id && r.seq !== null) out.set(`${r.lesson_id}:${r.student_id}`, r.seq);
      }
    }
    return out;
  }
}

const SEQ_CHUNK = 100;
