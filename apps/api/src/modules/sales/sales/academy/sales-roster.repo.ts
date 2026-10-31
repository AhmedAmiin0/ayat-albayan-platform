import type { Tables } from '@ab/db';
import type { Attendance, LessonStatus } from '@ab/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';
import { WEEKLY_RULE_COLUMNS, type WeeklyRuleRow } from '@/modules/sales/sales/schedule/weekly-slot';

/** An active rule of one of the page's students (never its link or subscription). */
export interface RosterRuleRow {
  student_id: string;
  rule: WeeklyRuleRow;
}

/** A student's package (owner 2026-10-30): size, status and dates only; never a price. */
export type RosterPackageRow = Pick<
  Tables<'subscriptions'>,
  'id' | 'student_id' | 'package' | 'status' | 'starts_on' | 'renews_on' | 'lessons_total' | 'created_at'
>;

/** A package's balance (v_subscription_balance): used (lessons_used_before in), left, end. */
export type RosterBalanceRow = Pick<
  Tables<'v_subscription_balance'>,
  'subscription_id' | 'lessons_used' | 'remaining' | 'ended_at' | 'projected_end_at'
>;

/** A past lesson of one of the page's students: its status and the student's own attendance. */
export interface RosterLessonRow {
  student_id: string;
  attendance: Attendance | null;
  lesson: { starts_at: string; status: LessonStatus };
}

const RULE_SELECT = `student_id, rule:schedule_rules!inner(${WEEKLY_RULE_COLUMNS})` as const;
const PACKAGE_SELECT =
  'id, student_id, package, status, starts_on, renews_on, lessons_total, created_at' as const;
const BALANCE_SELECT = 'subscription_id, lessons_used, remaining, ended_at, projected_end_at' as const;
const LESSON_SELECT = 'student_id, attendance, lesson:lessons!inner(starts_at, status)' as const;

/** PostgREST answers at most 1000 rows (config.toml max_rows): lessons and packages are paged. */
const PAGE = 1000;
const MAX_PAGES = 10;
const rangeOf = (page: number): [number, number] => [page * PAGE, page * PAGE + PAGE - 1];

/**
 * «كل الطلاب»'s schedule, attendance and current package (owner 2026-10-30): one read per kind for
 * the WHOLE page of students, never one per row. Service role, whitelisted columns: never a price,
 * currency, payment, commission or link.
 */
@Injectable()
export class SalesRosterRepo {
  private readonly log = new Logger(SalesRosterRepo.name);

  constructor(@Inject(DB) private readonly db: Db) {}

  async rules(studentIds: readonly string[]): Promise<RosterRuleRow[]> {
    if (studentIds.length === 0) return [];
    const { data, error } = await this.db
      .from('schedule_rule_students')
      .select(RULE_SELECT)
      .in('student_id', [...studentIds])
      .eq('rule.status', 'active');
    if (error) throw dbError(error);
    return data;
  }

  /** The students' packages, newest first (starts_on, created_at, id), paged: never a price. */
  async packages(studentIds: readonly string[]): Promise<RosterPackageRow[]> {
    if (studentIds.length === 0) return [];
    return await this.paged('packages', async (page) => {
      const { data, error } = await this.db
        .from('subscriptions')
        .select(PACKAGE_SELECT)
        .in('student_id', [...studentIds])
        .order('starts_on', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(...rangeOf(page));
      if (error) throw dbError(error);
      return data;
    });
  }

  /** The balances of the given packages (a cancelled one has no row). */
  async balances(subscriptionIds: readonly string[]): Promise<RosterBalanceRow[]> {
    if (subscriptionIds.length === 0) return [];
    const { data, error } = await this.db
      .from('v_subscription_balance')
      .select(BALANCE_SELECT)
      .in('subscription_id', [...subscriptionIds]);
    if (error) throw dbError(error);
    return data;
  }

  /** The students' lessons that started inside [from, to), in pages of PAGE rows. */
  async lessons(
    studentIds: readonly string[],
    w: { from: Date; to: Date },
  ): Promise<RosterLessonRow[]> {
    if (studentIds.length === 0) return [];
    return await this.paged('lessons', (page) => this.lessonPage(studentIds, { ...w, page }));
  }

  /** Pages of PAGE rows until a short one; warns at MAX_PAGES (a count, never an id). */
  private async paged<T>(kind: string, read: (page: number) => Promise<T[]>): Promise<T[]> {
    const out: T[] = [];
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const rows = await read(page);
      out.push(...rows);
      if (rows.length < PAGE) return out;
    }
    this.log.warn(`roster ${kind}: capped at ${MAX_PAGES * PAGE} rows, the rest not counted`);
    return out;
  }

  private async lessonPage(
    studentIds: readonly string[],
    w: { from: Date; to: Date; page: number },
  ): Promise<RosterLessonRow[]> {
    const { data, error } = await this.db
      .from('lesson_students')
      .select(LESSON_SELECT)
      .in('student_id', [...studentIds])
      .gte('lesson.starts_at', w.from.toISOString())
      .lt('lesson.starts_at', w.to.toISOString())
      .order('lesson_id')
      .order('student_id')
      .range(...rangeOf(w.page))
      .overrideTypes<RosterLessonRow[], { merge: false }>();
    if (error) throw dbError(error);
    return data;
  }
}
