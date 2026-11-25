import type { LessonStatus } from '@ab/catalog';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';
import { PortalSettings, type PortalSettingsValues } from '@/modules/people/portal/portal.settings';

/** A lesson row as the portal reads it (whitelisted select; mapped again before it leaves). */
export interface PortalLessonRow {
  id: string;
  /** For the family slots (the lesson's own teacher); never sent to the family. */
  teacher_id?: string;
  starts_at: string;
  ends_at: string;
  status: LessonStatus;
  room_opened_at: string | null;
  /** Migration 20261117100100; optional in test fakes. */
  room_ended_at?: string | null;
  meeting_link: string | null;
  teacher: { display_name_ar: string; display_name_en: string | null; meeting_mode: string | null } | null;
  /** Every attendee id: one = the student's override link may apply, more = a group lesson. */
  lesson_students: { student_id: string; chargeable?: boolean }[];
}

/** lesson_proposals rows with requested_by 'family'. */
export interface PortalRequestRow {
  id: string;
  lesson_id: string;
  status: string;
  proposed_starts_at: string;
  note: string | null;
  decision_note: string | null;
  decided_at: string | null;
  created_at: string;
}

/** PortalLessonsRepo.requests: these lessons, sent by this login. */
interface RequestsOf {
  lessonIds: readonly string[];
  userId: string;
}

interface Embed {
  lesson: PortalLessonRow | null;
}

const LESSON = 'id, teacher_id, starts_at, ends_at, status, room_opened_at, room_ended_at, meeting_link, teacher:teachers(display_name_ar, display_name_en, meeting_mode), lesson_students(student_id, chargeable)';
/** The family's own words and the academy's answer to them; never a teacher's proposal. */
const REQUEST = 'id, lesson_id, status, proposed_starts_at, note, decision_note, decided_at, created_at';

/** Service role; PortalScopes already decided the student is the caller's. */
@Injectable()
export class PortalLessonsRepo {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly settings: PortalSettings,
  ) {}

  /** The join window and settings.meeting_link_auto (cached settings). */
  readSettings(): Promise<PortalSettingsValues> {
    return this.settings.read();
  }

  /**
   * The student's lessons whose room is not closed yet (ends after `since`) and starting before
   * `until`.
   */
  async ahead(input: { studentId: string; since: string; until: string }): Promise<PortalLessonRow[]> {
    const { data, error } = await this.db
      .from('lesson_students')
      .select(`lesson:lessons!inner(${LESSON})`)
      .eq('student_id', input.studentId)
      .gte('lesson.ends_at', input.since)
      .lt('lesson.starts_at', input.until)
      .neq('lesson.status', 'rescheduled')
      .limit(100)
      .overrideTypes<Embed[], { merge: false }>();
    if (error) throw dbError(error);
    return data.flatMap((r) => (r.lesson ? [r.lesson] : [])).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }

  /** One lesson of the student, or null when the student is not on it. */
  async one(input: { studentId: string; lessonId: string }): Promise<PortalLessonRow | null> {
    const { data, error } = await this.db
      .from('lesson_students')
      .select(`lesson:lessons!inner(${LESSON})`)
      .match({ student_id: input.studentId, lesson_id: input.lessonId })
      .maybeSingle()
      .overrideTypes<Embed | null, { merge: false }>();
    if (error) throw dbError(error);
    return data?.lesson ?? null;
  }

  /** students.meeting_link_override: the student's own room for an external one-student lesson. */
  async override(studentId: string): Promise<string | null> {
    const { data, error } = await this.db.from('students').select('meeting_link_override').eq('id', studentId).maybeSingle();
    if (error) throw dbError(error);
    return data?.meeting_link_override ?? null;
  }

  /**
   * The family requests this login sent on these lessons, any status; [] without
   * lessons. Another login's request (the other guardian's) is not this one's to see.
   */
  async requests(input: RequestsOf): Promise<PortalRequestRow[]> {
    if (input.lessonIds.length === 0) return [];
    const { data, error } = await this.db
      .from('lesson_proposals')
      .select(REQUEST)
      .in('lesson_id', [...input.lessonIds])
      .match({ requested_by: 'family', created_by: input.userId });
    if (error) throw dbError(error);
    return data;
  }
}
