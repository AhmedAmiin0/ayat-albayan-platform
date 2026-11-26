import { joinWindowConfig, OPEN_LESSON_STATUSES, type JoinWindowConfig } from '@ab/schedule';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { rows } from '@/common/db/errors';
import { FAMILY_STUDENT_SELECT } from '@/common/push/family-readers';
import { ClassroomSettings } from '@/modules/teaching/classroom';
import { STARTED_GRACE_MIN, type FamilyLesson, type SentReport } from './family-push.plan';
import { lessonOf, reportOf } from './family-push.mapper';

const STUDENT = FAMILY_STUDENT_SELECT;
const LESSON = `id, starts_at, ends_at, room_opened_at, lesson_students(student:students(${STUDENT}))`;
const REPORT = `id, lesson_id, sent_at, link:lesson_students(lesson:lessons(starts_at), student:students(${STUDENT}))`;
/** A room staff opened earlier than this before the start is told of once it is this close. */
const EARLY_ROOM_MIN = 60;
/** How far back a sent report is still news (a worker down for a while catches up). */
export const REPORT_LOOKBACK_MIN = 120;
const LIMIT = 500;
const MIN_MS = 60_000;

const at = (now: Date, min: number) => new Date(now.getTime() + min * MIN_MS).toISOString();

/** Reads of the family pushes' sweep (service role; PushService writes the rows). */
@Injectable()
export class FamilyPushRepo {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(ClassroomSettings) private readonly settings: ClassroomSettings,
  ) {}

  /** settings.join_opens_before_min / join_closes_after_min (the classroom's cached reader). */
  async window(): Promise<JoinWindowConfig> {
    return joinWindowConfig(await this.settings.read());
  }

  /** Open lessons from STARTED_GRACE_MIN ago up to the window's (or an early room's) reach. */
  async lessonsNearStart(now: Date, win: JoinWindowConfig): Promise<FamilyLesson[]> {
    const data = rows(await this.db
      .from('lessons')
      .select(LESSON)
      .in('status', [...OPEN_LESSON_STATUSES])
      .gte('starts_at', at(now, -STARTED_GRACE_MIN))
      .lte('starts_at', at(now, win.opensBeforeMin + EARLY_ROOM_MIN))
      .order('starts_at')
      .limit(LIMIT));
    return data.map(lessonOf);
  }

  /** Reports whose sent_at was stamped since `since` (the report_ready message went out). */
  async reportsSentSince(since: Date): Promise<SentReport[]> {
    const data = rows(await this.db
      .from('lesson_reports')
      .select(REPORT)
      .gte('sent_at', since.toISOString())
      .order('sent_at')
      .limit(LIMIT));
    return data.flatMap(reportOf);
  }
}
