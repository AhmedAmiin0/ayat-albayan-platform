import { OPEN_LESSON_STATUSES, type LessonStatus } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';
import { readAll, readChunked } from '../../../teaching/scheduling/read-all';

/** Open or with an outcome; never cancelled or moved (docs/11 R11). */
const REPORTABLE: readonly LessonStatus[] = [...OPEN_LESSON_STATUSES, 'completed', 'late', 'excused', 'no_show'];

const PENDING =
  'lesson_id, student_id, student:students(id, code, name), lesson:lessons!inner(id, starts_at, status, teacher:teachers(id, display_name_ar, display_name_en)), lesson_reports(id)';
const UNPAID =
  'id, package, lessons_total, price, currency, starts_on, created_at, student:students(id, code, name), payments(amount, kind)';
const TASK = 'id, kind, subject_type, subject_id, title, due_at, done_at, created_at';

/** The admin's queue (GET /dashboard/work). Service role; the controller is admin-only. */
@Injectable()
export class WorkQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * (lesson, student) pairs of lessons that started, open or with an outcome, without a SUBMITTED
   * report (none yet, or a draft). Mirrors B1's R11 for every teacher: the embed keeps only
   * submitted reports and `is.null` keeps the rows that have none (an anti-join).
   */
  pendingReports(now: Date) {
    return readAll((from, to) =>
      this.db
        .from('lesson_students')
        .select(PENDING)
        .lte('lesson.starts_at', now.toISOString())
        .in('lesson.status', [...REPORTABLE])
        .eq('lesson_reports.status', 'submitted')
        .is('lesson_reports', null)
        .order('lesson_id')
        .order('student_id')
        .range(from, to),
    );
  }

  /** Packages with status unpaid, oldest first. ponytail: read whole; the list is the admin's queue. */
  unpaid() {
    return readAll((from, to) =>
      this.db
        .from('subscriptions')
        .select(UNPAID)
        .eq('status', 'unpaid')
        .order('starts_on')
        .order('created_at')
        .order('id')
        .range(from, to),
    );
  }

  /** Open admin tasks, oldest first. */
  openTasks() {
    return readAll((from, to) =>
      this.db
        .from('admin_tasks')
        .select(TASK)
        .is('done_at', null)
        .order('created_at')
        .order('id')
        .range(from, to),
    );
  }

  /** Student and lesson use of the packages the tasks are about (v_subscription_balance, service role only). */
  async taskSubjects(subscriptionIds: readonly string[]) {
    const ids = [...new Set(subscriptionIds)];
    const [subs, balances] = await Promise.all([
      readChunked(ids, (chunk) => this.db.from('subscriptions').select('id, student:students(id, code, name)').in('id', chunk)),
      readChunked(ids, (chunk) =>
        this.db.from('v_subscription_balance').select('subscription_id, lessons_total, lessons_used').in('subscription_id', chunk),
      ),
    ]);
    const used = new Map(balances.map((b) => [b.subscription_id, b]));
    return subs.map((s) => ({ id: s.id, student: s.student, balance: used.get(s.id) ?? null }));
  }
}

export type PendingRow = Awaited<ReturnType<WorkQueries['pendingReports']>>[number];
