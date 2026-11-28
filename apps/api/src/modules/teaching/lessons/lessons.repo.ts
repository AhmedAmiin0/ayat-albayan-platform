import type { LessonStatus } from '@ab/catalog';
import { meetingModeOf, OPEN_LESSON_STATUSES, usesPlatform } from '@ab/schedule';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { readAll } from '@/common/db/read-all';
import type { SortSpec } from '@/common/db/list-sort';
import { readPage, toPage } from '@/common/db/page';
import type { PageQuery } from '@/common/http/http';
import { maybe, pgError, rows } from '@/common/db/errors';
import type { Contact } from './status/confirmation-messages';
import { LESSON_SELECT, type LessonRow } from './store/lesson-row';
import { LessonsSettings } from './lessons.settings';
import { seqChunks, seqMap } from './lesson-seq';
import type { Page } from '@ab/core';

export interface LessonWindow { from: Date; to: Date; teacherId?: string }
interface OpenLesson { id: string; status: LessonStatus; starts_at: string }
/** `${lesson_id}:${student_id}` → lesson number (v_lesson_sequence). */
export type SeqMap = ReadonlyMap<string, number>;

const STUDENT_LESSON_ORDER: SortSpec<never> = {
  columns: {},
  fallback: [{ column: 'starts_at', ascending: false }],
};

/** Reads of lessons for the views and the write services (service role — callers guard). */
@Injectable()
export class LessonsRepo {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly settings: LessonsSettings,
  ) {}

  async get(id: string): Promise<LessonRow | null> {
    const data = maybe(await this.db.from('lessons').select(LESSON_SELECT).eq('id', id).maybeSingle());
    return data;
  }

  /** By starts_at; ids are few (one action's lessons). */
  async byIds(ids: readonly string[]): Promise<LessonRow[]> {
    if (ids.length === 0) return [];
    const byId = this.db.from('lessons').select(LESSON_SELECT).in('id', [...ids]);
    return rows(await byId.order('starts_at').order('id'));
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

  /** One student's lessons, newest first (route 5); the rows are re-read whole, in page order. */
  async studentPage(studentId: string, input: PageQuery): Promise<Page<LessonRow>> {
    const read = () =>
      this.db
        .from('lessons')
        .select('id, lesson_students!inner(student_id)', { count: 'exact' })
        .eq('lesson_students.student_id', studentId);
    const { rows: ids, total } = await readPage(read, input, STUDENT_LESSON_ORDER);
    const order = new Map(ids.map((r, i) => [r.id, i]));
    const lessons = await this.byIds(ids.map((r) => r.id));
    lessons.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    return toPage(lessons, total, input);
  }

  /**
   * The teacher's lessons go out with our classroom: usesPlatform(teachers.meeting_mode,
   * settings.meeting_link_auto) (migration 490). true = a confirmation names no fixed link
   * (forMessages).
   */
  async meetingLinkAuto(opts: { teacherId: string }): Promise<boolean> {
    const [auto, { data, error }] = await Promise.all([
      this.academyAuto(),
      this.db.from('teachers').select('meeting_mode').eq('id', opts.teacherId).maybeSingle(),
    ]);
    if (error) throw pgError(error);
    return usesPlatform(meetingModeOf(data?.meeting_mode), auto);
  }

  /** settings.meeting_link_auto: the default for a teacher whose meeting_mode is null. */
  async academyAuto(): Promise<boolean> {
    return (await this.settings.read()).meeting_link_auto;
  }

  /** settings.report_teacher_edit_minutes: the lesson's report state (docs/46 B7). */
  async reportMinutes(): Promise<number> {
    return (await this.settings.read()).report_teacher_edit_minutes;
  }

  /** Each student's name + guardian, for the queued confirmation (docs/10 §5.11). */
  async contacts(studentIds: readonly string[]): Promise<Contact[]> {
    if (studentIds.length === 0) return [];
    const { data, error } = await this.db
      .from('students')
      .select('id, name, guardian:guardians(id, phone_e164, tz)')
      .in('id', [...studentIds]);
    if (error) throw pgError(error);
    return data;
  }

  async studentExists(id: string): Promise<boolean> {
    const data = maybe(await this.db.from('students').select('id').eq('id', id).maybeSingle());
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
   * Lesson numbers (R-LES-03) for completed lessons, in chunks so the URL stays short; the chunks
   * are read in parallel (one round trip, not one per 100 lessons). TODO(R-LES-03):
   * v_lesson_sequence counts `completed` only; owner to confirm whether `late` counts.
   */
  async seq(lessonIds: readonly string[]): Promise<SeqMap> {
    const view = () => this.db.from('v_lesson_sequence').select('lesson_id, student_id, seq');
    const reads = await Promise.all(seqChunks(lessonIds).map((ids) => view().in('lesson_id', ids)));
    return seqMap(reads.flatMap((read) => rows(read)));
  }
}
